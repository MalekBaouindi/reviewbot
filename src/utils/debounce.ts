export class ReviewDebouncer {
  private map = new Map<string, number>();

  constructor(private windowMs = 30_000) {}

  canProceed(key: string): boolean {
    const now = Date.now();
    const last = this.map.get(key);
    if (last && now - last < this.windowMs) {
      return false;
    }
    this.map.set(key, now);
    return true;
  }

  clear(): void {
    this.map.clear();
  }
}
