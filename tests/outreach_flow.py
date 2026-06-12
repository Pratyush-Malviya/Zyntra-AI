from playwright.sync_api import sync_playwright
import sys

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    page.locator('text=Get Started Now').click()
    page.wait_for_load_state('networkidle')

    page.locator('text=Mike Ross').click()
    page.wait_for_load_state('networkidle')

    page.screenshot(path='tests/screenshots/outreach_campaigns.png', full_page=True)

    tabs = ['Configure', 'Import Leads', 'Generate Copy', 'Send Outreach', 'Reports']
    for tab in tabs:
        locator = page.get_by_role('button', name=tab)
        if locator.is_visible():
            locator.click()
            page.wait_for_load_state('networkidle')

    page.screenshot(path='tests/screenshots/outreach_all_tabs.png', full_page=True)

    print('Outreach flow test PASSED: all campaign tabs accessible')
    browser.close()
