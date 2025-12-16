# run.py — FINAL WORKING VERSION
import os
import sys
import time
import threading

# Force correct working directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from src.app import app
from src.mqtt import start_mqtt

# PyQt5
from PyQt5.QtWidgets import QApplication, QMainWindow, QShortcut
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineSettings
from PyQt5.QtCore import QUrl, Qt, QCoreApplication
from PyQt5.QtGui import QKeySequence

# Qt sandbox settings for restricted environments
os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--no-sandbox"
os.environ["XDG_RUNTIME_DIR"] = "/tmp/runtime-root"
os.makedirs("/tmp/runtime-root", exist_ok=True)
os.chmod("/tmp/runtime-root", 700)


class BrowserWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.setCursor(Qt.BlankCursor)
        self.showFullScreen()

        self.browser.setContextMenuPolicy(Qt.NoContextMenu)
        self.browser.settings().setAttribute(QWebEngineSettings.ShowScrollBars, False)
        self.browser.settings().setAttribute(QWebEngineSettings.JavascriptEnabled, True)

        js = """
        (function(){
            var m = document.createElement('meta');
            m.name = 'viewport';
            m.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(m);
            var block = e => e.preventDefault();
            ['gesturestart','gesturechange','gestureend'].forEach(ev => 
                document.addEventListener(ev, block, {passive:false}));
            document.addEventListener('touchmove', e => e.touches.length > 1 && e.preventDefault(), {passive:false});
            document.addEventListener('wheel', e => e.ctrlKey && e.preventDefault(), {passive:false});
        })();
        """
        self.browser.loadFinished.connect(lambda _: self.browser.page().runJavaScript(js))

        for seq in [QKeySequence.ZoomIn, QKeySequence.ZoomOut, "Ctrl+=", "Ctrl+-", "Ctrl+0"]:
            QShortcut(seq, self)

        self.browser.setUrl(QUrl("http://127.0.0.1:5000"))

    def keyPressEvent(self, e):
        if e.key() == Qt.Key_F4 and e.modifiers() == Qt.AltModifier:
            self.close()
        super().keyPressEvent(e)

    def wheelEvent(self, e):
        if e.modifiers() & Qt.ControlModifier:
            e.ignore()
        else:
            super().wheelEvent(e)


if __name__ == "__main__":
    print("Starting MQTT...")
    start_mqtt()
    time.sleep(2)

    print("Starting Flask...")
    threading.Thread(target=lambda: app.run(
        host="0.0.0.0", port=5000, debug=False, use_reloader=False, threaded=True
    ), daemon=True).start()
    time.sleep(2)

    print("Starting UI...")
    qt_app = QApplication(sys.argv)
    win = BrowserWindow()
    win.show()
    sys.exit(qt_app.exec_())