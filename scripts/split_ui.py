import os
import re

UI_DIR = os.path.join("js", "ui")
UI_JS = os.path.join("js", "ui.js")

os.makedirs(UI_DIR, exist_ok=True)

with open(UI_JS, "r", encoding="utf-8") as f:
    lines = f.readlines()

modals_lines = ["window.initModals = function() {\n"]
filters_lines = ["window.initFilters = function() {\n"]
table_events_lines = ["window.initTableEvents = function() {\n"]
utils_lines = []

for i, line in enumerate(lines):
    idx = i + 1
    
    if 1 <= idx <= 6:
        continue
    elif 7 <= idx <= 51:
        modals_lines.append(line)
    elif 52 <= idx <= 230:
        filters_lines.append(line)
    elif 232 <= idx <= 276:
        table_events_lines.append(line)
    elif 277 <= idx <= 283:
        continue
    elif 284 <= idx <= 357:
        utils_lines.append(line)

modals_lines.append("};\n\n")
modals_lines.extend(utils_lines)

filters_lines.append("};\n")
table_events_lines.append("};\n")

with open(os.path.join(UI_DIR, "modals.js"), "w", encoding="utf-8") as f:
    f.writelines(modals_lines)

with open(os.path.join(UI_DIR, "filters.js"), "w", encoding="utf-8") as f:
    f.writelines(filters_lines)
    
with open(os.path.join(UI_DIR, "table-events.js"), "w", encoding="utf-8") as f:
    f.writelines(table_events_lines)

with open(UI_JS, "w", encoding="utf-8") as f:
    f.write('// 核心切分後的 UI 入口檔案\n')
    f.write('window.initUI = function() {\n')
    f.write('    console.debug("[UI] initUI start");\n')
    f.write('    try {\n')
    f.write('        if (typeof window.initModals === "function") window.initModals();\n')
    f.write('        if (typeof window.initFilters === "function") window.initFilters();\n')
    f.write('        if (typeof window.initTableEvents === "function") window.initTableEvents();\n')
    f.write('        console.debug("[UI] initUI done");\n')
    f.write('    } catch (e) {\n')
    f.write('        console.error("[UI] initUI failed", e);\n')
    f.write('        throw e;\n')
    f.write('    }\n')
    f.write('};\n')

print("UI splitting completed.")
