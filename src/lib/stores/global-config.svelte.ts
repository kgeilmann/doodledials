import type { ExportFormat } from '$lib/utils/export-formats';

const STORAGE_KEY = 'doodledial:config';

interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: ExportFormat;
}

export const DEFAULTS = {
	diameter: 200,
	centerHoleDiameter: 2,
	pathLabelOptimizerEnabled: false,
	forceDirectedOptimizerEnabled: false,
	optimizerGapDefault: 5,
	bruteforceTimeLimit: 120,
	defaultExportFormat: 'laser-svg'
} as const satisfies PersistedConfig;

class GlobalConfigStore {
	diameter: number = $state(DEFAULTS.diameter);
	centerHoleDiameter: number = $state(DEFAULTS.centerHoleDiameter);
	pathLabelOptimizerEnabled: boolean = $state(DEFAULTS.pathLabelOptimizerEnabled);
	forceDirectedOptimizerEnabled: boolean = $state(DEFAULTS.forceDirectedOptimizerEnabled);
	optimizerGapDefault: number = $state(DEFAULTS.optimizerGapDefault);
	bruteforceTimeLimit: number = $state(DEFAULTS.bruteforceTimeLimit);
	defaultExportFormat: ExportFormat = $state(DEFAULTS.defaultExportFormat);
	constructor() {
		this._load();
		$effect.root(() => {
			$effect(() => {
				void this.diameter;
				void this.centerHoleDiameter;
				void this.pathLabelOptimizerEnabled;
				void this.forceDirectedOptimizerEnabled;
				void this.optimizerGapDefault;
				void this.bruteforceTimeLimit;
				void this.defaultExportFormat;
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
		this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
		this.forceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
		this.optimizerGapDefault = DEFAULTS.optimizerGapDefault;
		this.bruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		this.defaultExportFormat = DEFAULTS.defaultExportFormat;
	}

	private _load(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
				this.diameter = parsed.diameter ?? DEFAULTS.diameter;
				this.centerHoleDiameter = parsed.centerHoleDiameter ?? DEFAULTS.centerHoleDiameter;
				this.pathLabelOptimizerEnabled =
					parsed.pathLabelOptimizerEnabled ?? DEFAULTS.pathLabelOptimizerEnabled;
				this.forceDirectedOptimizerEnabled =
					parsed.forceDirectedOptimizerEnabled ?? DEFAULTS.forceDirectedOptimizerEnabled;
				this.optimizerGapDefault = parsed.optimizerGapDefault ?? DEFAULTS.optimizerGapDefault;
				this.bruteforceTimeLimit = parsed.bruteforceTimeLimit ?? DEFAULTS.bruteforceTimeLimit;
				this.defaultExportFormat = parsed.defaultExportFormat ?? DEFAULTS.defaultExportFormat;
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
				pathLabelOptimizerEnabled: this.pathLabelOptimizerEnabled,
				forceDirectedOptimizerEnabled: this.forceDirectedOptimizerEnabled,
				optimizerGapDefault: this.optimizerGapDefault,
				bruteforceTimeLimit: this.bruteforceTimeLimit,
				defaultExportFormat: this.defaultExportFormat
			})
		);
	}
}

export const globalConfig = new GlobalConfigStore();
