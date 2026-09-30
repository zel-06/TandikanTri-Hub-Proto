CSV_FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')


def csv_safe(value):
    """Neutralizes CSV/formula injection: Excel/Sheets treats a cell starting with
    =, +, -, @ (or a leading tab/CR) as a formula to evaluate when the file is opened.
    Prefixing it with a single quote forces it to be read as plain text instead.
    """
    text = '' if value is None else str(value)
    if text and text[0] in CSV_FORMULA_PREFIXES:
        return "'" + text
    return text


def csv_safe_row(row):
    return [csv_safe(v) for v in row]
