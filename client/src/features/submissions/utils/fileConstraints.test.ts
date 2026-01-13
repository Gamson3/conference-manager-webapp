import { describe, it, expect } from 'vitest';
import { validateFiles, buildAcceptAttr } from './fileConstraints';

// Use a minimal mock object instead of Blob/File to avoid requiring jsdom
function makeFile(name: string, sizeBytes: number): File {
  return ({ name, size: sizeBytes } as unknown) as File;
}

describe('fileConstraints utils', () => {
  it('builds accept attribute', () => {
    expect(buildAcceptAttr(['pdf', '.docx'])).toBe('.pdf,.docx');
    expect(buildAcceptAttr([])).toBeUndefined();
  });

  it('validates size and extension', () => {
    const files = [
      makeFile('paper.pdf', 1024),
      makeFile('slides.pptx', 2 * 1024 * 1024),
      makeFile('image.png', 10),
    ];
    const res = validateFiles(files, 1 /* MB */, ['pdf', 'pptx']);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('image.png'))).toBe(true);
    expect(res.errors.some((e) => e.includes('slides.pptx'))).toBe(true); // size exceeded
  });
});
