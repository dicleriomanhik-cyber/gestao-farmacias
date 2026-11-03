export type ExtrasSplitMode = "BY_VALUE" | "BY_UNITS";

export interface PharmacySettings {
  id: string;
  pharmacyId: string;
  allowCashExpenses: boolean;
  collaboratorExpenses: boolean;
  requireApprovalForCash: boolean;
  usePayables: boolean;
  multiCurrency: boolean;
  extrasSplitMode: ExtrasSplitMode;
  supplierExtraFields: boolean;
  vatRegime: string | null;
}

export type PharmacySettingsUpdate = Partial<Omit<PharmacySettings, "id" | "pharmacyId">>;