export interface WorkstationPackage {
  id: string;
  name: string;
  slug: string;
  pricePerMonth: number; // EUR cents
  isIncluded: boolean;
  description: string;
  features: string[];
  isActive?: boolean;
  position?: number;
}

export interface WorkstationComponentOption {
  id: string;
  name: string;
  pricePerMonth: number; // EUR cents
  isIncluded: boolean;
  description: string;
  isActive?: boolean;
  position?: number;
}

export interface WorkstationAddon {
  id: string;
  name: string;
  pricePerMonth: number; // EUR cents
  description: string;
  isActive?: boolean;
  position?: number;
}

export interface WorkstationComponents {
  desk: WorkstationComponentOption[];
  chair: WorkstationComponentOption[];
  monitor: WorkstationComponentOption[];
  keyboardMouse: WorkstationComponentOption[];
}

export interface WorkstationData {
  packages: WorkstationPackage[];
  components: WorkstationComponents;
  addons: WorkstationAddon[];
}

export interface WorkstationSelection {
  packageId?: string;
  deskId?: string;
  chairId?: string;
  monitorId?: string;
  keyboardMouseId?: string;
  addonIds?: string[];
  customMonthlyPriceEUR?: number; // EUR cents
}
