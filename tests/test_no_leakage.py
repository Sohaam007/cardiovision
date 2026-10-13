import pytest


@pytest.mark.skip(reason="Placeholder test skipped until ML-01 fills it")
def test_no_leakage():
    """Ensure LAD, LCX, RCA, Cath, and CAD are never used as model features."""
    pass
