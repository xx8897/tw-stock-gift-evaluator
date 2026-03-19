import pandas as pd
import os

def filter_stocks():
    data_dir = os.path.join(os.getcwd(), 'data')
    files = ['三月.xlsx', '四月.xlsx']
    exclude_conditions = ["可零股，需特定方式領取", "不限股數皆可領取"]
    
    all_filtered_data = []
    
    print("正在開始篩選特殊領取資格資料...")
    
    for file in files:
        file_path = os.path.join(data_dir, file)
        if os.path.exists(file_path):
            df = pd.read_excel(file_path)
            # 篩選：領取資格 不等於 指定的兩項
            filtered_df = df[~df['領取資格'].isin(exclude_conditions)]
            if not filtered_df.empty:
                all_filtered_data.append(filtered_df)
                print(f"從 {file} 篩選出 {len(filtered_df)} 筆特殊資格資料。")
            else:
                print(f"{file} 中沒有特殊的領取資格資料。")
        else:
            print(f"找不到檔案：{file_path}")

    if all_filtered_data:
        result_df = pd.concat(all_filtered_data, ignore_index=True)
        output_path = os.path.join(data_dir, '特殊領取資格彙整.xlsx')
        result_df.to_excel(output_path, index=False)
        print(f"\n篩選完成！結果已儲存至：{output_path}")
        print("-" * 30)
        print("特殊資格股票摘要：")
        print(result_df[['股票代號', '股票名稱', '領取資格']])
    else:
        print("\n沒有找到符合條件（非標準領取方式）的資料。")

if __name__ == "__main__":
    filter_stocks()
