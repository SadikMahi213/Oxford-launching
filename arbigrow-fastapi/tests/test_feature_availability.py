"""Feature availability: Soon-states + Admin Notification removal (Phases 1-6).

Source-level guards ensuring inactive features perform no API/database work:
 1. Transaction tab renders Soon (no transaction-history fetch effect).
 2. STARD Mining card renders Soon; no mining API imports/calls in OverviewPage.
 3. Marketplace/Seller tabs render Soon.
 4. Admin notification UI + API files removed; backend router unregistered;
    shared notify infrastructure (model/service/helper) preserved.
"""
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent.parent
FE = REPO / "ArbiGrow" / "src"
BE = REPO / "arbigrow-fastapi" / "app"


def _read(path):
    return pathlib.Path(path).read_text(encoding="utf-8")


class TestSoonStates:
    def test_transaction_tab_renders_soon(self):
        src = _read(FE / "page" / "UserDashboard.jsx")
        assert 'if (activePage === "transactions")' in src
        assert "SoonView title=" in src
        assert "return <LazyTransactionHistoryPage" not in src, \
            "transactions tab must not mount the history component"

    def test_transaction_fetch_disabled(self):
        src = _read(FE / "page" / "UserDashboard.jsx")
        for api in ("getMyDeposits", "getMyWithdrawals", "getMyProfitHistory",
                    "getTransferHistory", "getMyInvestments",
                    "getMyMatchingBonuses", "getMyCaptchaEarnings",
                    "getMyMiningHistory", "getMyAdViewHistory",
                    "getMyInvoiceHistory", "getVendorWithdraws",
                    "getEcommerceWalletTransactions",
                    "getMyWalletTransactions"):
            assert f"_safeFetch({api}" not in src, \
                f"{api} must not be fetched for the Soon transaction tab"

    def test_mining_renders_soon_without_api(self):
        src = _read(FE / "component" / "user" / "OverviewPage.jsx")
        for api in ("startMining", "claimMining", "getMiningStatus"):
            assert api not in src, f"{api} must not be referenced"
        assert "handleStartMining" not in src
        assert "handleClaimMining" not in src
        assert "setInterval" not in src, "no mining countdown polling"
        assert "Soon" in src

    def test_marketplace_seller_render_soon(self):
        src = _read(FE / "page" / "UserDashboard.jsx")
        assert "return <LazyMarketplacePage" not in src
        assert "return <LazySellerDashboard" not in src
        assert 'if (activePage === "marketplace")' in src
        assert 'if (activePage === "seller")' in src

    def test_soon_badge_flags(self):
        src = _read(FE / "page" / "UserDashboard.jsx")
        assert src.count("comingSoon: true") >= 3, \
            "transactions/marketplace/seller entries must carry the Soon badge"


class TestAdminNotificationRemoved:
    def test_frontend_files_deleted(self):
        assert not (FE / "component" / "admin" / "notifications").exists()
        assert not (FE / "api" / "notification.api.js").exists()

    def test_frontend_unreferenced(self):
        for path in (FE / "component" / "admin" / "AdminLayout.jsx",
                     FE / "page" / "AdminDashboard.jsx"):
            src = _read(path)
            for token in ("NotificationBell", "PopupNotification",
                          "NotificationHistory", "notification.api",
                          '"notifications"'):
                assert token not in src, f"{token} still referenced in {path.name}"

    def test_backend_router_unregistered(self):
        assert not (BE / "api" / "v1" / "admin_notifications.py").exists()
        router = _read(BE / "api" / "router.py")
        assert "admin_notifications" not in router

    def test_shared_notify_infrastructure_preserved(self):
        assert (BE / "models" / "notification.py").exists()
        assert (BE / "services" / "notification_service.py").exists()
        assert (BE / "utils" / "notifications.py").exists()
        helper = _read(BE / "utils" / "notifications.py")
        assert "def notify_admin" in helper
