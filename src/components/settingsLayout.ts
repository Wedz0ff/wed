export interface SettingsSection {
  title: string;
  items: string[];
}

export interface SettingsColumns {
  left: SettingsSection;
  right: SettingsSection;
}

export function settingsColumns(
  themes: string[],
  webUi: boolean,
): SettingsColumns {
  return {
    left: { title: 'WEB UI', items: [`Web UI    ${webUi ? 'ON' : 'OFF'}`] },
    right: { title: 'THEME', items: [...themes] },
  };
}
