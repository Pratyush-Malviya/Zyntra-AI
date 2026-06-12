from playwright.sync_api import sync_playwright
import sys

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
SCREENSHOT_DIR = 'tests/screenshots'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    logs = []
    page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))

    page.goto(BASE_URL)
    page.wait_for_load_state('networkidle')

    assert 'ZYNTRA' in page.text_content('body'), 'Landing page should show Zyntra branding'
    assert page.locator('text=Get Started Now').is_visible(), 'CTA button should be visible'
    assert page.locator('#faq').is_visible(), 'FAQ section should be visible'

    page.screenshot(path=f'{SCREENSHOT_DIR}/landing.png', full_page=True)

    page.locator('text=Get Started Now').click()
    page.wait_for_load_state('networkidle')

    assert page.locator('text=Sign in with Google Account').is_visible(), 'Login page should show Google Sign-In'
    assert page.locator('text=Instant Demo Presets').is_visible(), 'Login page should show demo presets'

    page.screenshot(path=f'{SCREENSHOT_DIR}/login.png', full_page=True)

    console_errors = [l for l in logs if l.startswith('error') or l.startswith('warning')]
    if console_errors:
        print(f'Console issues found: {len(console_errors)}')
        for e in console_errors[:5]:
            print(f'  {e}')

    if errors:
        print(f'Page errors found: {errors}')
        sys.exit(1)

    print(f'Smoke test PASSED: landing + login pages load successfully')
    browser.close()
