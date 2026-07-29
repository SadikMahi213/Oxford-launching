def format_decimal(value):
    if value is None:
        return "0.00000000000000"
    return f"{value:.14f}"
