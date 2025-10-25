export class FormulaParser {
  private input: string;
  private index: number;

  constructor(input: string) {
    this.input = input;
    this.index = 0;
  }

  static evaluate(expression: string): number | null {
    try {
      const parser = new FormulaParser(expression);
      const value = parser.parseExpression();
      parser.skipWhitespace();
      if (!parser.isAtEnd()) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipWhitespace();
      const char = this.peek();
      if (char === "+" || char === "-") {
        this.consume();
        const right = this.parseTerm();
        value = char === "+" ? value + right : value - right;
      } else {
        break;
      }
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (true) {
      this.skipWhitespace();
      const char = this.peek();
      if (char === "*" || char === "/") {
        this.consume();
        const right = this.parseFactor();
        value = char === "*" ? value * right : value / right;
      } else {
        break;
      }
    }
    return value;
  }

  private parseFactor(): number {
    this.skipWhitespace();
    const char = this.peek();

    if (char === "+" || char === "-") {
      this.consume();
      const value = this.parseFactor();
      return char === "-" ? -value : value;
    }

    if (char === "(") {
      this.consume();
      const value = this.parseExpression();
      this.skipWhitespace();
      if (this.peek() !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      this.consume();
      return value;
    }

    return this.parseNumber();
  }

  private parseNumber(): number {
    this.skipWhitespace();
    const start = this.index;
    let hasDecimal = false;

    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char >= "0" && char <= "9") {
        this.consume();
      } else if (char === ".") {
        if (hasDecimal) {
          break;
        }
        hasDecimal = true;
        this.consume();
      } else {
        break;
      }
    }

    if (start === this.index) {
      throw new Error("Expected number");
    }

    const token = this.input.slice(start, this.index);
    const value = Number.parseFloat(token);
    if (Number.isNaN(value)) {
      throw new Error("Invalid number");
    }
    return value;
  }

  private skipWhitespace() {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.consume();
    }
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return "";
    }
    return this.input[this.index];
  }

  private consume(): string {
    const char = this.peek();
    this.index += 1;
    return char;
  }

  private isAtEnd(): boolean {
    return this.index >= this.input.length;
  }
}

export function evaluateFormulaExpression(expression: string): number | null {
  return FormulaParser.evaluate(expression);
}
