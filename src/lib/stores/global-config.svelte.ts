const STORAGE_KEY = 'doodledial:config';

interface PersistedConfig {
	diameter: number;
	centerHoleDiameter: number;
	pathLabelOptimizerEnabled: boolean;
	forceDirectedOptimizerEnabled: boolean;
	optimizerGapDefault: number;
	bruteforceTimeLimit: number;
	defaultExportFormat: 'laser-svg' | 'stl';
}

const DEFAULTS: PersistedConfig = {
	diameter: 200,
	centerHoleDiameter: 2,
	pathLabelOptimizerEnabled: false,
	forceDirectedOptimizerEnabled: false,
	optimizerGapDefault: 5,
	bruteforceTimeLimit: 120,
	defaultExportFormat: 'laser-svg'
};

class GlobalConfigStore {
	diameter = $state(DEFAULTS.diameter);
	centerHoleDiameter = $state(DEFAULTS.centerHoleDiameter);
	pathLabelOptimizerEnabled = $state(DEFAULTS.pathLabelOptimizerEnabled);
	forceDirectedOptimizerEnabled = $state(DEFAULTS.forceDirectedOptimizerEnabled);
	optimizerGapDefault = $state(DEFAULTS.optimizerGapDefault);
	bruteforceTimeLimit = $state(DEFAULTS.bruteforceTimeLimit);
	defaultExportFormat = $state<'laser-svg' | 'stl'>(DEFAULTS.defaultExportFormat);
	dialogOpen = $state(false);

	constructor() {
		this._load();
	}

	save() {
		this._save();
	}

	open() {
		this.dialogOpen = true;
	}

	close() {
		this.dialogOpen = false;
	}

	reset() {
		this.diameter = DEFAULTS.diameter;
		this.centerHoleDiameter = DEFAULTS.centerHoleDiameter;
		this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
		this.forceDirectedOptimizerEnabled = DEFAULTS.forceDirectedOptimizerEnabled;
		this.optimizerGapDefault = DEFAULTS.optimizerGapDefault;
		this.bruteforceTimeLimit = DEFAULTS.bruteforceTimeLimit;
		this.defaultExportFormat = DEFAULTS.defaultExportFormat;
		this.dialogOpen = false;
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
		} catch {
			// ignore corrupt data, use defaults
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
