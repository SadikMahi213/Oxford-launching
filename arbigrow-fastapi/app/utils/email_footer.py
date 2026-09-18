def get_email_footer(company_name: str, year: int, website_url: str):
    return f"""
        <!-- DARK FOOTER SECTION -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#0f172a; margin-top:50px;">
            <tr>
                <td align="center" style="padding:40px 20px;">

                    <table width="600" cellpadding="0" cellspacing="0" border="0"
                           style="max-width:600px; text-align:center; font-family:Arial, sans-serif; color:#94a3b8;">

                        <!-- Social Icons -->
                        <tr>
                            <td style="padding-bottom:20px;">

                                <a href="https://x.com/arbigrow" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="22">
                                </a>

                                <a href="https://youtube.com/@arbigrow-official?si=ucCCPJtcdebgkUfZ" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174883.png" width="22">
                                </a>

                                <a href="https://t.me/Arbigrow" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="22">
                                </a>

                                <a href="https://t.me/ArbigrowOfficial" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="22">
                                </a>

                                <a href="https://www.facebook.com/share/189Y6dLmQq/" style="margin:0 8px;">
                                    <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" width="22">
                                </a>

                            </td>
                        </tr>

                        <tr>
                            <td style="padding-bottom:10px;">
                                <a href="{website_url}" style="color:#38bdf8; text-decoration:none;">
                                    {website_url}
                                </a>
                            </td>
                        </tr>

                        <tr>
                            <td style="font-size:12px;">
                                © {year} {company_name}. All rights reserved.
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    """
