import type { CenterStyle } from '$lib/types/doodledial';
import type { ExportFormat } from '$lib/utils/export-formats';

const STORAGE_KEY = 'doodledial:config';

interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	autoLabelPlacementEnabled: boolean;
	forceDirectedSolverEnabled: boolean;
	solverGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: ExportFormat;
	titleFontFamily: string;
	centerStyle: CenterStyle;
	cutoutLabelFontSize: number;
	dialTitleFontSize: number;
}

export const DEFAULTS = {
	diameter: 100,
	centerHoleDiameter: 0.5,
	autoLabelPlacementEnabled: false,
	forceDirectedSolverEnabled: false,
	solverGapDefault: 3,
	bruteforceTimeLimit: 120,
	defaultExportFormat: 'laser-svg',
	titleFontFamily: 'sans-serif',
	centerStyle: 'hole' as CenterStyle,
	cutoutLabelFontSize: 10,
	dialTitleFontSize: 12
} as const satisfies PersistedConfig;

class GlobalConfigStore {
	diameter: number = $state(DEFAULTS.diameter);
	centerHoleDiameter: number = $state(DEFAULTS.centerHoleDiameter);
	autoLabelPlacementEnabled: boolean = $state(DEFAULTS.autoLabelPlacementEnabled);
	forceDirectedSolverEnabled: boolean = $state(DEFAULTS.forceDirectedSolverEnabled);
	solverGapDefault: number = $state(DEFAULTS.solverGapDefault);
	bruteforceTimeLimit: number = $state(DEFAULTS.bruteforceTimeLimit);
	defaultExportFormat: ExportFormat = $state(DEFAULTS.defaultExportFormat);
	titleFontFamily: string = $state(DEFAULTS.titleFontFamily);
	centerStyle: CenterStyle = $state(DEFAULTS.centerStyle);
	cutoutLabelFontSize: number = $state(DEFAULTS.cutoutLabelFontSize);
	dialTitleFontSize: number = $state(DEFAULTS.dialTitleFontSize);
	constructor() {
		this._load();
		$effect.root(() => {
			$effect(() => {
				void this.diameter;
				void this.centerHoleDiameter;
				void this.autoLabelPlacementEnabled;
				void this.forceDirectedSolverEnabled;
				void this.solverGapDefault;
				void this.bruteforceTimeLimit;
				void this.defaultExportFormat;
				void this.titleFontFamily;
				void this.centerStyle;
				void this.cutoutLabelFontSize;
				void this.dialTitleFontSize;
				this._save();
			});
		});
	}

	save() {
		this._save();
	}

	reset() {
		this.diameter = DEFAULTS.diameter;
		this.centerHoleDiameter = DEFAULTS.centerHoleDiameter;
		this.autoLabelPlacementEnabled = DEFAULTS.autoLabelPlacementEnabled;
		this.forceDirectedSolverEnabled = DEFAULTS.forceDirectedSolverEnabled;
		this.solverGapDefault = DEFAULTS.solverGapDefault;
		this.bruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		this.defaultExportFormat = DEFAULTS.defaultExportFormat;
		this.titleFontFamily = DEFAULTS.titleFontFamily;
		this.centerStyle = DEFAULTS.centerStyle;
		this.cutoutLabelFontSize = DEFAULTS.cutoutLabelFontSize;
		this.dialTitleFontSize = DEFAULTS.dialTitleFontSize;
	}

	private _load(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
				this.diameter = parsed.diameter ?? DEFAULTS.diameter;
				this.centerHoleDiameter = parsed.centerHoleDiameter ?? DEFAULTS.centerHoleDiameter;
				this.autoLabelPlacementEnabled =
					parsed.autoLabelPlacementEnabled ?? DEFAULTS.autoLabelPlacementEnabled;
				this.forceDirectedSolverEnabled =
					parsed.forceDirectedSolverEnabled ?? DEFAULTS.forceDirectedSolverEnabled;
				this.solverGapDefault = parsed.solverGapDefault ?? DEFAULTS.solverGapDefault;
				this.bruteforceTimeLimit = parsed.bruteforceTimeLimit ?? DEFAULTS.bruteforceTimeLimit;
				this.defaultExportFormat = parsed.defaultExportFormat ?? DEFAULTS.defaultExportFormat;
				this.titleFontFamily = parsed.titleFontFamily ?? DEFAULTS.titleFontFamily;
				this.centerStyle = parsed.centerStyle ?? DEFAULTS.centerStyle;
				this.cutoutLabelFontSize = parsed.cutoutLabelFontSize ?? DEFAULTS.cutoutLabelFontSize;
				this.dialTitleFontSize = parsed.dialTitleFontSize ?? DEFAULTS.dialTitleFontSize;
			}
		} catch (e) {
			console.warn('[global-config] Failed to load persisted config, using defaults:', e);
		}
	}

	private _save(): void {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				diameter: this.diameter,
				centerHoleDiameter: this.centerHoleDiameter,
				autoLabelPlacementEnabled: this.autoLabelPlacementEnabled,
				forceDirectedSolverEnabled: this.forceDirectedSolverEnabled,
				solverGapDefault: this.solverGapDefault,
				bruteforceTimeLimit: this.bruteforceTimeLimit,
				defaultExportFormat: this.defaultExportFormat,
				titleFontFamily: this.titleFontFamily,
				centerStyle: this.centerStyle,
				cutoutLabelFontSize: this.cutoutLabelFontSize,
				dialTitleFontSize: this.dialTitleFontSize
			})
		);
	}
}

export const globalConfig = new GlobalConfigStore();
