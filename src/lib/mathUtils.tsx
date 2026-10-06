import React from 'react';

/**
 * Formats mathematical text seamlessly into standard readable text
 * without awkward equation boxes or foreign serif math layouts.
 * 
 * Handles cases like:
 * - x_k = P^k x_0  =>  x<sub>k</sub> = P<sup>k</sup> x<sub>0</sub>
 * - x_{k+1} = P x_k => x<sub>k+1</sub> = P x<sub>k</sub>
 * - A^T = A => A<sup>T</sup> = A
 * - A^-1 or A^{-1} => A<sup>-1</sup>
 * - λ^2 - 7λ + 10 = 0 => λ<sup>2</sup> - 7λ + 10 = 0
 * - det(A - λ I) = 0
 * - lim_{n → ∞} r^n = 0
 * - 2^|Q|
 * - v_1, λ_1, q_1, ω_0, ω_d
 */
export function renderFormattedMath(text: string): React.ReactNode {
  if (!text) return null;

  // Pattern matching:
  // 1. Base with braced subscript: e.g. x_{k+1}, lim_{n → ∞}
  // 2. Base with simple subscript: e.g. x_k, x_0, v_1, λ_1, q_2, ω_0
  // 3. Base with braced superscript: e.g. P^{k}, A^{-1}, 2^{|Q|}
  // 4. Base with simple superscript: e.g. P^k, A^T, λ^2, ω^2, r^n, 2^n
  const tokenRegex = /([a-zA-Zα-ωΑ-Ωλωσδε0-9\(\)]+)_(?:\{([^}]+)\}|([a-zA-Z0-9α-ωΑ-Ωλωσδε\+\-]+))|([a-zA-Zα-ωΑ-Ωλωσδε0-9\)\|\}]+)\^(?:\{([^}]+)\}|([a-zA-Z0-9\+\-T\|]+))/g;

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add text preceding the match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Subscript match: base is match[1], sub is match[2] or match[3]
      const base = match[1];
      const sub = match[2] ?? match[3];
      result.push(
        <React.Fragment key={`sub-${match.index}`}>
          {base}
          <sub>{sub}</sub>
        </React.Fragment>
      );
    } else if (match[4] !== undefined) {
      // Superscript match: base is match[4], sup is match[5] or match[6]
      const base = match[4];
      const sup = match[5] ?? match[6];
      result.push(
        <React.Fragment key={`sup-${match.index}`}>
          {base}
          <sup>{sup}</sup>
        </React.Fragment>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Add trailing text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result.length > 0 ? result : text;
}
