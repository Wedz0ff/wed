export function stripAnsi(text: string): string {
  return text.replace(
    // eslint-disable-next-line no-control-regex -- CSI / OSC sequences
    /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?(?:\u0007|\u001B\\))/g,
    '',
  );
}
