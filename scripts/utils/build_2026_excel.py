"""
建立 2026 年度股東會 Excel。
- 以 20260322公告.xlsx 為基底（舊格式，欄位需對應轉換）
- 以 20260323.xlsx 為更新資料（新格式）
- 以 (股號, 股東會日期) 為 key：相符則更新，不符則新增
- 輸出 data/2026.xlsx
"""

import pandas as pd
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(_BASE_DIR, '..', 'data')

FILE_BASE   = os.path.join(DATA_DIR, '20260322公告.xlsx')
FILE_UPDATE = os.path.join(DATA_DIR, '20260323.xlsx')
FILE_OUTPUT = os.path.join(DATA_DIR, '2026.xlsx')

# 新格式統一欄位順序
COLS = ['股號', '名稱', '最後買進日', '股東會日期', '紀念品', '條件']


def load_base(path):
    """載入舊格式公告，轉換成新格式欄位。"""
    df = pd.read_excel(path)
    print(f"基底欄位: {df.columns.tolist()}")

    rename_map = {
        '代號':      '股號',
        '股東會紀念品': '紀念品',
    }
    df = df.rename(columns=rename_map)

    # 移除不需要的欄位（性質）
    df = df.drop(columns=[c for c in ['性質'] if c in df.columns])

    # 補上新欄位 條件（舊資料無此欄，預設空白）
    if '條件' not in df.columns:
        df['條件'] = ''

    # 強制型別
    df['股號'] = df['股號'].astype(str).str.strip()
    df['股東會日期'] = pd.to_datetime(df['股東會日期'], errors='coerce')

    return df[COLS]


def load_update(path):
    """載入新格式更新資料。"""
    df = pd.read_excel(path)
    print(f"更新欄位: {df.columns.tolist()}")

    df['股號'] = df['股號'].astype(str).str.strip()
    df['股東會日期'] = pd.to_datetime(df['股東會日期'], errors='coerce')

    return df[COLS]


def merge(base_df, update_df):
    """
    以 (股號, 股東會日期) 為 key：
    - 相符 → 用 update 覆蓋
    - 不符 → 新增
    """
    key = ['股號', '股東會日期']

    # 先把 base 中與 update 重複的 key 移除
    merged = base_df[~base_df.set_index(key).index.isin(
        update_df.set_index(key).index
    )].copy()

    # 合併 update
    merged = pd.concat([merged, update_df], ignore_index=True)

    # 依最後買進日排序
    merged['最後買進日'] = pd.to_datetime(merged['最後買進日'], errors='coerce')
    merged = merged.sort_values(by='最後買進日', ascending=True, na_position='last')

    return merged.reset_index(drop=True)


def main():
    for f in [FILE_BASE, FILE_UPDATE]:
        if not os.path.exists(f):
            print(f"ERROR: 找不到檔案 {f}")
            return

    print("載入基底資料...")
    base_df   = load_base(FILE_BASE)
    print(f"  → {len(base_df)} 筆\n")

    print("載入更新資料...")
    update_df = load_update(FILE_UPDATE)
    print(f"  → {len(update_df)} 筆\n")

    print("合併中...")
    result = merge(base_df, update_df)
    print(f"  → 合併後共 {len(result)} 筆")
    print(f"    (更新: {len(update_df)} 筆, 純新增: {len(result) - len(base_df)} 筆)\n")

    result.to_excel(FILE_OUTPUT, index=False)
    print(f"✅ 輸出完成: {FILE_OUTPUT}")


if __name__ == "__main__":
    main()
