"""Check PDFs emitted by tests/refined-browser.mjs (requires PyMuPDF)."""
from pathlib import Path
import pymupdf

folder = Path('test-results/refined')
for name in ['reference', 'random', 'extended']:
    document = pymupdf.open(folder / f'{name}.pdf')
    if name == 'reference':
        assert len(document) == 4, 'The reference fixture must retain four pages.'
        expected = {0: '3.0 Reference Documents:', 1: '5.0 Details of activities carried out:', 2: '7.0 Inspection Photographs:', 3: '8.0 Expenditure Report:'}
        for number, heading in expected.items():
            assert heading in document[number].get_text(), (number, heading)
    for number, page in enumerate(document):
        text = page.get_text()
        assert text.count('INSPECTION REPORT') == 1, (name, number, 'missing/duplicated header')
        assert f'Page {number + 1} of {len(document)}' in text
        assert 'Doc. No: AESPL/IR/01 Rev.00;' in text
        assert 'Effective Date: 01.04.2026' in text
        for block in page.get_text('dict')['blocks']:
            if 'lines' not in block:
                continue
            for line in block['lines']:
                for span in line['spans']:
                    x0, y0, x1, y1 = span['bbox']
                    assert 30 <= x0 <= x1 <= 585, (name, number, span['text'], span['bbox'])
                    assert 15 <= y0 <= y1 <= 775, (name, number, span['text'], span['bbox'])
                    if y0 > 133 and not span['text'].startswith(('Page ', 'Doc. No:', 'Effective Date:')):
                        assert y1 < 747, (name, number, 'body entered footer', span['text'])
    assert '--- End of Report ---' in document[-1].get_text()
    print(f'{name}: {len(document)} pages; headers, footers, content bounds and end marker verified.')
