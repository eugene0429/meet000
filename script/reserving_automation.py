import json
import csv
import os
import sys
import time
import re
import subprocess
from datetime import datetime, timedelta
import pytz
from solapi import SolapiMessageService
from solapi.model import RequestMessage, SendRequestConfig
from solapi.model.kakao.kakao_option import KakaoOption

# ✅ 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS_PATH = os.path.join(BASE_DIR, "secret.json")
CONFIG_PATH = os.path.join(BASE_DIR, "assets", "message_config.json")
CSV_PATH = os.path.join(BASE_DIR, "assets", "000_DB.csv")
SYNC_SCRIPT_PATH = os.path.join(BASE_DIR, "script", "sync_csv_to_notion.py")
MEMBER_PATH = os.path.join(BASE_DIR, "assets", "member.json")

# ✅ 설정 로드
def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading {path}: {e}")
        sys.exit(1)

SECRETS = load_json(SECRETS_PATH)
CONFIG = load_json(CONFIG_PATH)
MEMBERS = load_json(MEMBER_PATH)

SOLAPI_API_KEY = SECRETS["solapi_api_key"]
SOLAPI_API_SECRET = SECRETS["solapi_api_secret"]

PF_ID = CONFIG["pf_id"]
SENDER_NUMBER = CONFIG["sender_number"]
TEMPLATES = CONFIG["templates"]

# member.json에서 전화번호 매핑 생성 (Name -> Phone)
PHONE_NUMBERS = {m["name"]: m["phone"] for m in MEMBERS}

message_service = SolapiMessageService(SOLAPI_API_KEY, SOLAPI_API_SECRET)

# ✅ 날짜 파싱 (sync_csv_to_notion.py에서 가져옴)
def parse_korean_date(date_str):
    try:
        parts = date_str.split(' → ')
        start_part = parts[0]
        end_part = parts[1] if len(parts) > 1 else None

        def parse_part(part, base_date=None):
            if not part:
                return None
            full_pattern = r'(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2})'
            match = re.match(full_pattern, part)
            
            if match:
                year, month, day, ampm, hour, minute = match.groups()
                year, month, day = int(year), int(month), int(day)
                hour, minute = int(hour), int(minute)
                
                if ampm == '오후' and hour != 12:
                    hour += 12
                elif ampm == '오전' and hour == 12:
                    hour = 0
                    
                return datetime(year, month, day, hour, minute)
            
            time_pattern = r'(오전|오후) (\d{1,2}):(\d{2})'
            match = re.match(time_pattern, part)
            if match and base_date:
                ampm, hour, minute = match.groups()
                hour, minute = int(hour), int(minute)
                
                if ampm == '오후' and hour != 12:
                    hour += 12
                elif ampm == '오전' and hour == 12:
                    hour = 0
                
                return datetime(base_date.year, base_date.month, base_date.day, hour, minute)
                
            return None

        start_dt = parse_part(start_part)
        if not start_dt:
            return None, None
            
        end_dt = parse_part(end_part, base_date=start_dt)
        return start_dt, end_dt

    except Exception as e:
        return None, None

# ✅ 메시지 발송 함수들
def send_kakao_template(to_number, name, month, day, hour, clean_type):
    variables = {
        "#{name}": str(name),
        "#{month}": str(month),
        "#{day}": str(day),
        "#{hour}": str(hour),
        "#{type}": str(clean_type),
    }
    kakao_option = KakaoOption(pf_id=PF_ID, template_id=TEMPLATES["immediate"], variables=variables)
    message = RequestMessage(from_=SENDER_NUMBER, to=to_number, kakao_options=kakao_option)
    try:
        message_service.send(message)
        print(f"📬 [청소] 즉시 발송 성공 ({name})")
        return True
    except Exception as e:
        print(f"❌ [청소] 즉시 발송 실패: {e}")
        return False

def send_kakao_template_reserved(to_number, name, month, day, hour, clean_type, scheduled_time_kst):
    variables = {
        "#{name}": str(name),
        "#{month}": str(month),
        "#{day}": str(day),
        "#{hour}": str(hour),
        "#{type}": str(clean_type),
    }
    kakao_option = KakaoOption(pf_id=PF_ID, template_id=TEMPLATES["reserved"], variables=variables)
    message = RequestMessage(from_=SENDER_NUMBER, to=to_number, kakao_options=kakao_option)
    request_config = SendRequestConfig(scheduled_date=scheduled_time_kst)
    try:
        message_service.send(message, request_config)
        print(f"📬 [청소] 예약 발송 성공 ({name}, {scheduled_time_kst})")
        return True
    except Exception as e:
        print(f"❌ [청소] 예약 발송 실패: {e}")
        return False

def send_kakao_template_customer(to_number, year, month, day, time_str):
    variables = {
        "#{year}": str(year),
        "#{month}": str(month),
        "#{day}": str(day),
        "#{time}": str(time_str),
    }
    kakao_option = KakaoOption(pf_id=PF_ID, template_id=TEMPLATES["customer"], variables=variables)
    message = RequestMessage(from_=SENDER_NUMBER, to=to_number, kakao_options=kakao_option)
    try:
        message_service.send(message)
        print(f"📬 [고객] 즉시 발송 성공 ({to_number})")
        return True
    except Exception as e:
        print(f"❌ [고객] 즉시 발송 실패: {e}")
        return False

def send_kakao_template_customer_reserved(to_number, scheduled_time_kst):
    kakao_option = KakaoOption(pf_id=PF_ID, template_id=TEMPLATES["customer_reserved"])
    message = RequestMessage(from_=SENDER_NUMBER, to=to_number, kakao_options=kakao_option)
    request_config = SendRequestConfig(scheduled_date=scheduled_time_kst)
    try:
        message_service.send(message, request_config)
        print(f"📬 [고객] 예약 발송 성공 ({to_number}, {scheduled_time_kst})")
        return True
    except Exception as e:
        print(f"❌ [고객] 예약 발송 실패: {e}")
        return False

# ✅ 메인 로직
def process_reservations(target_time=None):
    if not os.path.exists(CSV_PATH):
        print("❌ CSV file not found.")
        return

    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    updated_count = 0
    KST = pytz.timezone("Asia/Seoul")

    for row in rows:
        # 특정 예약만 처리하는 경우 필터링
        if target_time and row['예약시간'] != target_time:
            continue

        start_dt, end_dt = parse_korean_date(row['예약시간'])
        if not start_dt:
            continue

        # Naive -> Aware (KST)
        start_time = KST.localize(start_dt)
        end_time = KST.localize(end_dt) if end_dt else start_time + timedelta(hours=2)

        # 1. 청소 알림 처리
        if row.get('청소알림') == 'No':
            print(f"🧹 Processing Cleaning Notification for {row['예약자명']}...")
            success_cleaning = True
            
            # 앞청소/뒷청소 담당자 확인
            for clean_type_field, clean_type_text in [("앞청소", "앞"), ("뒷청소", "뒷")]:
                person_name = row.get(clean_type_field)
                if person_name and person_name in PHONE_NUMBERS:
                    phone = PHONE_NUMBERS[person_name]
                    
                    if clean_type_text == "앞":
                        clean_time = start_time - timedelta(hours=1)
                    else:
                        clean_time = end_time # 뒷청소는 종료시간

                    scheduled_time = clean_time - timedelta(hours=2)
                    
                    # 메시지 변수
                    month = f"{clean_time.month:02}"
                    day = f"{clean_time.day:02}"
                    hour = f"{clean_time.hour:02}"

                    # 발송
                    res_now = send_kakao_template(phone, person_name, month, day, hour, clean_type_text)
                    res_reserved = send_kakao_template_reserved(phone, person_name, month, day, hour, clean_type_text, scheduled_time)
                    
                    if not (res_now and res_reserved):
                        success_cleaning = False
                elif person_name:
                    print(f"⚠️ {person_name} 전화번호 없음")
                    # 전화번호 없으면 실패로 간주하지 않고 넘어갈지? 일단 실패로 간주하지 않음 (담당자 문제이므로)
                    pass

            if success_cleaning:
                row['청소알림'] = 'Yes'
                updated_count += 1

        # 2. 예약 문자 처리
        if row.get('예약문자') == 'No':
            print(f"📩 Processing Customer Notification for {row['예약자명']}...")
            customer_phone = row.get('연락처')
            if customer_phone:
                customer_phone = customer_phone.replace('-', '')
                
                year = f"{start_time.year}"
                month = f"{start_time.month:02}"
                day = f"{start_time.day:02}"
                
                start_display = start_time.strftime("%I%p").lstrip("0").upper()
                end_display = end_time.strftime("%I%p").lstrip("0").upper()
                
                is_next_day = start_time.date() != end_time.date()
                if is_next_day:
                    time_str = f"{start_display} ~ 익일 {end_display}"
                else:
                    time_str = f"{start_display} ~ {end_display}"

                res_now = send_kakao_template_customer(customer_phone, year, month, day, time_str)
                res_reserved = send_kakao_template_customer_reserved(customer_phone, start_time - timedelta(hours=2))

                if res_now and res_reserved:
                    row['예약문자'] = 'Yes'
                    updated_count += 1
            else:
                print("⚠️ 고객 전화번호 없음")

    # 변경사항 저장
    if updated_count > 0:
        with open(CSV_PATH, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"💾 Updated {updated_count} rows in CSV.")
        
        # Notion Sync 트리거
        print("🔄 Triggering Notion Sync...")
        subprocess.run(["python3", SYNC_SCRIPT_PATH])
    else:
        print("✨ No updates needed.")

if __name__ == "__main__":
    target_time = None
    if len(sys.argv) > 1:
        # 인자로 특정 예약시간을 받으면 그것만 처리 (옵션)
        # 예: python reserving_automation.py "2026년 1월 3일..."
        target_time = sys.argv[1]
        print(f"🎯 Targeting specific reservation: {target_time}")
    
    process_reservations(target_time)