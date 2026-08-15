export class LineAssembler {
  private pending = '';

  push(chunk: string): string[] {
    this.pending += chunk;
    const lines: string[] = [];
    let newline = this.pending.indexOf('\n');
    while (newline !== -1) {
      lines.push(this.stripCarriage(this.pending.slice(0, newline)));
      this.pending = this.pending.slice(newline + 1);
      newline = this.pending.indexOf('\n');
    }
    return lines;
  }

  flush(): string | undefined {
    if (this.pending.length === 0) {
      return undefined;
    }
    const leftover = this.stripCarriage(this.pending);
    this.pending = '';
    return leftover;
  }

  private stripCarriage(line: string): string {
    return line.endsWith('\r') ? line.slice(0, -1) : line.replace(/\r/g, '');
  }
}
