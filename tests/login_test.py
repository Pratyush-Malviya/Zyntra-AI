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

    demo_names = 'Pratyush Malviya, Harvey Specter, Mike Ross, Louis Litt, Rachel Zane, Donna Paulsen'
    for name in demo_names.split(', '):
        assert page.locator(f'text={name}').is_visible(), f'Demo user {name} should be visible'

    assert page.locator('text=Sign in with Google Account').is_visible(), 'Google OAuth button should exist'

    page.screenshot(path='tests/screenshots/login_all_roles.png', full_page=True)

    page.locator('text=Mike Ross').click()
    page.wait_for_load_state('networkidle')

    page.screenshot(path='tests/screenshots/sdr_dashboard.png', full_page=True)

    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.wait_for_timeout(2000)

    body_text = page.inner_text('body')
    assert 'Outreach' in body_text, f'SDR should see Outreach header. Found: {body_text[:200]}'

    if errors:
        print(f'Page errors after login: {errors}')

    print('Login flow test PASSED: all demo presets present and SDR login works')
    browser.close()
