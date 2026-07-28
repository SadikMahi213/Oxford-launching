def get_email_header(
    logo_src: str = "https://i.ibb.co/J1v8jYk/Arbigrow-Logo.png"
):
    return f"""
        <!-- HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
                <td align="center" style="padding:34px 0 16px 0;">
                    <a href="https://www.oxfordfinancialads.com" style="text-decoration:none;">
                        <img src="{logo_src}" alt="Oxford Financial Ads" border="0" width="170"
                             style="display:block; width:170px; max-width:170px; height:auto; margin:0 auto;">
                    </a>
                </td>
            </tr>
        </table>
    """
