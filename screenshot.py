from playwright.sync_api import sync_playwright
import time

def take_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        
        print("Navigating to http://localhost:3000...")
        try:
            page.goto('http://localhost:3000', wait_until='networkidle')
            time.sleep(2) # Wait for animations
            page.screenshot(path='c:/Users/sony/OneDrive/Desktop/Zyntra-AI/screenshot.png')
            print("Screenshot saved to c:/Users/sony/OneDrive/Desktop/Zyntra-AI/screenshot.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    take_screenshot()
