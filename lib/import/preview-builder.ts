import { prisma } from "@/lib/prisma";

import { normalizeEmpresa, normalizeText } from "@/lib/import/normalizers";
import type {
    ImportDuplicateItem,
    ImportIssue,
    ImportPreview,
    ParsedExcelImport,
    ParsedExcelImportRow,
} from "@/lib/import/types";
import { createImportIssue } from "@/lib/import/validators";

type ExistingContratistaLookupRecord = {
    id: number;
    razonSocial: string;
    rut?: string | null;
};

type ExistingVehicleRecord = {
    id: number;
    licensePlate: string;
    company: string;
    contratista: {
        razonSocial: string;
    } | null;
};

function sortIssues(left: ImportIssue, right: ImportIssue) {
    if (left.severity !== right.severity) {
        return left.severity === "critical" ? -1 : 1;
    }

    return (left.rowNumber ?? 0) - (right.rowNumber ?? 0) || left.message.localeCompare(right.message, "es");
}

function groupRowsByKey(rows: ParsedExcelImportRow[], getKey: (row: ParsedExcelImportRow) => string) {
    const groups = new Map<string, ParsedExcelImportRow[]>();

    for (const row of rows) {
        const key = getKey(row);
        const group = groups.get(key);

        if (group) {
            group.push(row);
            continue;
        }

        groups.set(key, [row]);
    }

    return groups;
}

export function buildNormalizedContratistaLookup(records: ExistingContratistaLookupRecord[]) {
    const lookup = new Map<string, ExistingContratistaLookupRecord>();
    const ambiguousKeys = new Set<string>();

    for (const record of records) {
        const key = normalizeEmpresa(record.razonSocial);

        if (!key) {
            continue;
        }

        if (lookup.has(key)) {
            ambiguousKeys.add(key);
            continue;
        }

        lookup.set(key, record);
    }

    return {
        lookup,
        ambiguousKeys: Array.from(ambiguousKeys),
    };
}

export async function buildImportPreview(parsed: ParsedExcelImport): Promise<ImportPreview> {
    const issues: ImportIssue[] = [...parsed.issues];
    const duplicates: ImportDuplicateItem[] = [];
    const empresaGroups = groupRowsByKey(parsed.rows, (row) => row.empresaKey);
    const patenteGroups = groupRowsByKey(parsed.rows, (row) => row.patente);
    const uniqueRows: ParsedExcelImportRow[] = [];
    const conflictingPlateKeys = new Set<string>();
    const baseCriticalIssueRowNumbers = new Set(
        parsed.issues
            .filter((issue) => issue.severity === "critical" && typeof issue.rowNumber === "number")
            .map((issue) => issue.rowNumber as number),
    );

    const contractorRecords = await prisma.contratista.findMany({
        select: {
            id: true,
            razonSocial: true,
            rut: true,
        },
        orderBy: {
            razonSocial: "asc",
        },
    });
    const contractorLookupResult = buildNormalizedContratistaLookup(contractorRecords);

    for (const ambiguousKey of contractorLookupResult.ambiguousKeys) {
        const conflictingRecords = contractorRecords
            .filter((record) => normalizeEmpresa(record.razonSocial) === ambiguousKey)
            .map((record) => record.razonSocial)
            .join(", ");

        issues.push(createImportIssue({
            code: "ambiguous-contractor-in-database",
            severity: "critical",
            field: "Base de datos",
            message: `La base de datos tiene contratistas duplicados para la empresa normalizada ${ambiguousKey}: ${conflictingRecords}.`,
        }));
    }

    for (const [patente, rows] of Array.from(patenteGroups.entries())) {
        if (!patente) {
            continue;
        }

        const sortedRows = [...rows].sort((left, right) => left.__row - right.__row);
        const preferredRow = sortedRows.find((row) => !baseCriticalIssueRowNumbers.has(row.__row)) ?? sortedRows[0];
        const uniqueCompanyKeys = Array.from(new Set(sortedRows.map((row) => row.empresaKey))).filter(Boolean);
        const firstRow = preferredRow;

        if (uniqueCompanyKeys.length > 1) {
            conflictingPlateKeys.add(patente);
            duplicates.push({
                patente,
                empresa: firstRow.empresa,
                rowNumbers: sortedRows.map((row) => row.__row),
                kind: "different-company",
                conflictingEmpresas: Array.from(new Set(sortedRows.map((row) => row.empresa))),
                critical: true,
            });
            issues.push(createImportIssue({
                code: "conflicting-duplicate-license-plate",
                severity: "critical",
                field: "Patente",
                rowNumber: firstRow.__row,
                message: `La patente ${patente} aparece con empresas distintas dentro del Excel y bloquea toda la importación.`,
            }));
            continue;
        }

        uniqueRows.push(firstRow);

        if (sortedRows.length > 1) {
            duplicates.push({
                patente,
                empresa: firstRow.empresa,
                rowNumbers: sortedRows.map((row) => row.__row),
                kind: "same-company",
                critical: false,
            });
            issues.push(createImportIssue({
                code: "internal-duplicate-license-plate",
                severity: "warning",
                field: "Patente",
                rowNumber: firstRow.__row,
                message: `La patente ${patente} está repetida dentro del Excel para la misma empresa. Solo se considerará una fila.`,
            }));
        }
    }

    const hasGlobalCriticalIssues = issues.some(
        (issue) => issue.severity === "critical" && typeof issue.rowNumber !== "number",
    );
    const criticalIssueRowNumbers = new Set(
        issues
            .filter((issue) => issue.severity === "critical" && typeof issue.rowNumber === "number")
            .map((issue) => issue.rowNumber as number),
    );
    const importRows = hasGlobalCriticalIssues
        ? []
        : uniqueRows.filter(
            (row) => !conflictingPlateKeys.has(row.patente) && !criticalIssueRowNumbers.has(row.__row),
        );
    const uniquePlates = Array.from(new Set(importRows.map((row) => row.patente))).filter(Boolean);
    const existingVehicleRecords = uniquePlates.length > 0
        ? await prisma.vehicle.findMany({
            where: {
                licensePlate: {
                    in: uniquePlates,
                },
            },
            select: {
                id: true,
                licensePlate: true,
                company: true,
                contratista: {
                    select: {
                        razonSocial: true,
                    },
                },
            },
        })
        : [];
    const existingVehicleLookup = new Map<string, ExistingVehicleRecord>(
        existingVehicleRecords.map((vehicle) => [vehicle.licensePlate, vehicle]),
    );

    const contractorItems = Array.from(empresaGroups.entries())
        .filter(([empresaKey]) => Boolean(empresaKey))
        .map(([empresaKey, rows]) => {
            const firstRow = [...rows].sort((left, right) => left.__row - right.__row)[0];
            const existingContractor = contractorLookupResult.lookup.get(empresaKey) ?? null;

            return {
                empresa: firstRow.empresa,
                empresaKey,
                rowNumbers: rows.map((row) => row.__row).sort((left, right) => left - right),
                status: existingContractor ? "existing" as const : "new" as const,
                contratistaId: existingContractor?.id ?? null,
                razonSocialActual: existingContractor?.razonSocial ?? null,
            };
        })
        .sort((left, right) => left.empresa.localeCompare(right.empresa, "es"));

    const vehicleItems = importRows
        .map((row) => {
            const existingVehicle = existingVehicleLookup.get(row.patente) ?? null;
            const existingCompanyReference = existingVehicle?.contratista?.razonSocial ?? existingVehicle?.company ?? null;
            const patenteFueNormalizada = row.patenteFueNormalizada ?? (Boolean(row.patenteOriginal) && normalizeText(row.patenteOriginal) !== row.patente);
            const companyMismatch = Boolean(
                existingCompanyReference
                && normalizeEmpresa(existingCompanyReference) !== row.empresaKey,
            );

            if (existingVehicle && companyMismatch) {
                issues.push(createImportIssue({
                    code: "existing-vehicle-company-mismatch",
                    severity: "warning",
                    field: "Empresa",
                    rowNumber: row.__row,
                    message: `La patente ${row.patente} ya existe en base de datos con otra empresa. Se marcará como existente y no se actualizará.`,
                }));
            }

            return {
                patente: row.patente,
                patenteOriginal: row.patenteOriginal,
                patenteFueNormalizada,
                empresa: row.empresa,
                numeroInterno: row.numeroInterno,
                tipoVehiculo: row.tipoVehiculo,
                rowNumber: row.__row,
                status: existingVehicle ? "existing" as const : "new" as const,
                vehicleId: existingVehicle?.id ?? null,
                companyMismatch,
                companyActual: existingVehicle?.company ?? null,
                contratistaActual: existingVehicle?.contratista?.razonSocial ?? null,
            };
        })
        .sort((left, right) => left.patente.localeCompare(right.patente, "es"));

    if (parsed.nonEmptyRowCount > 0 && importRows.length === 0 && !issues.some((issue) => issue.severity === "critical")) {
        issues.push(createImportIssue({
            code: "no-importable-rows",
            severity: "critical",
            field: "Importación",
            message: "No se encontraron filas válidas para importar después de aplicar las validaciones y duplicados internos.",
        }));
    }

    const contractorNewItems = contractorItems.filter((item) => item.status === "new");
    const contractorExistingItems = contractorItems.filter((item) => item.status === "existing");
    const vehicleNewItems = vehicleItems.filter((item) => item.status === "new");
    const vehicleExistingItems = vehicleItems.filter((item) => item.status === "existing");
    const criticalErrors = issues.filter((issue) => issue.severity === "critical").length;
    const canImport = criticalErrors === 0 && (contractorNewItems.length > 0 || vehicleNewItems.length > 0);

    if (!canImport && criticalErrors === 0) {
        issues.push(createImportIssue({
            code: "nothing-to-import",
            severity: "warning",
            field: "Importación",
            message: "El archivo fue validado, pero no contiene contratistas o vehículos nuevos para insertar.",
        }));
    }

    return {
        fileName: parsed.fileName,
        sheetName: parsed.sheetName,
        generatedAt: new Date().toISOString(),
        summary: {
            totalRows: parsed.nonEmptyRowCount,
            validRows: importRows.length,
            blankRows: parsed.blankRowNumbers.length,
            newContractors: contractorNewItems.length,
            existingContractors: contractorExistingItems.length,
            newVehicles: vehicleNewItems.length,
            existingVehicles: vehicleExistingItems.length,
            duplicateInternal: duplicates.filter((duplicate) => !duplicate.critical).length,
            warnings: issues.filter((issue) => issue.severity === "warning").length,
            criticalErrors: issues.filter((issue) => issue.severity === "critical").length,
            canImport,
        },
        issues: [...issues].sort(sortIssues),
        duplicates: duplicates.sort((left, right) => left.patente.localeCompare(right.patente, "es")),
        contractors: {
            newItems: contractorNewItems,
            existingItems: contractorExistingItems,
        },
        vehicles: {
            newItems: vehicleNewItems,
            existingItems: vehicleExistingItems,
        },
        importRows,
    };
}