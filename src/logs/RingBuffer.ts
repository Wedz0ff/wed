export class RingBuffer<T> {
  private readonly buf: Array<T | undefined>;
  private start = 0;
  private count = 0;

  constructor(readonly capacity: number) {
    if (capacity < 1) {
      throw new Error('capacity must be >= 1');
    }
    this.buf = new Array<T | undefined>(capacity);
  }

  get length(): number {
    return this.count;
  }

  push(item: T): void {
    if (this.count < this.capacity) {
      this.buf[(this.start + this.count) % this.capacity] = item;
      this.count += 1;
      return;
    }
    this.buf[this.start] = item;
    this.start = (this.start + 1) % this.capacity;
  }

  at(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    return this.buf[(this.start + index) % this.capacity];
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this.count; i++) {
      out.push(this.buf[(this.start + i) % this.capacity]!);
    }
    return out;
  }

  clear(): void {
    this.start = 0;
    this.count = 0;
    this.buf.fill(undefined);
  }
}
