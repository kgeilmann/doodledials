const STORAGE_KEY = 'doodledial:config';

interface PersistedConfig {
	diameter: number;
	pathLabelOptimizerEnabled: boolean;
}

const DEFAULTS: PersistedConfig = {
	diameter: 200,
	pathLabelOptimizerEnabled: true
};

class GlobalConfigStore {
	diameter = $state(DEFAULTS.diameter);
	pathLabelOptimizerEnabled = $state(DEFAULTS.pathLabelOptimizerEnabled);
	dialogOpen = $state(false);

	constructor() {
		this._load();
		$effect.root(() => {
			$effect(() => {
				this._save();
			});
		});
	}

	open() {
		this.dialogOpen = true;
	}

	close() {
		this.dialogOpen = false;
	}

	reset() {
		this.diameter = DEFAULTS.diameter;
		this.pathLabelOptimizerEnabled = DEFAULTS.pathLabelOptimizerEnabled;
	}

	private _load(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<PersistedConfig>;
				this.diameter = parsed.diameter ?? DEFAULTS.diameter;
				this.pathLabelOptimizerEnabled =
					parsed.pathLabelOptimizerEnabled ?? DEFAULTS.pathLabelOptimizerEnabled;
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
				pathLabelOptimizerEnabled: this.pathLabelOptimizerEnabled
			})
		);
	}
}

export const globalConfig = new GlobalConfigStore();
