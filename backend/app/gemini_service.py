import json
import asyncio
from sqlalchemy.orm import Session
from app.models import Report, ReportStatus
from app.config import settings
from app.prompts import SYSTEM_PROMPT
from google import genai
from google.genai import types

async def process_report(report_id: int, db_session_factory):
    """
    Background task to process the report request using Gemini Deep Research (Interactions API).
    """
    async with db_session_factory() as db:
        report = await db.get(Report, report_id)
        if not report:
            return

        report.status = ReportStatus.PROCESSING
        await db.commit()

        try:
            # 1. Prepare Prompt
            user_query = report.query

            # 2. Configure Gemini
            if settings.GEMINI_API_KEY == "dummy_key":
                # Mock response for dev/test without key
                await asyncio.sleep(3)
                response_text = """
```json
{
  "summary": "MOCK RESULT: Deep Research simulated.",
  "key_metrics": [],
  "charts_data": [],
  "detailed_analysis": "Simulation without API Key.",
  "sources": []
}
"""
            else:
                client = genai.Client(
                    api_key=settings.GEMINI_API_KEY,
                    http_options=types.HttpOptions(api_version='v1alpha')
                )

                # Configuration for "Deep Research" agent
                agent_name = "deep-research-pro-preview-12-2025"

                # Объединяем системный промпт и запрос пользователя,
                # так как Interactions API принимает всё в поле input
                combined_input = f"{SYSTEM_PROMPT}\n\nUser Query:\n{user_query}"

                print(f"Starting Deep Research interaction for report {report_id}...")

                # ЗАПУСК ВЗАИМОДЕЙСТВИЯ (Interactions API)
                # Используем agent, убираем config (чтобы не было конфликта), ставим background=True
                interaction = await client.aio.interactions.create(
                    agent=agent_name,
                    input=combined_input,
                    background=True
                )

                # Исправление: используем .id вместо .name
                print(f"Deep Research started. Interaction ID: {interaction.id}")

                # ОЖИДАНИЕ ЗАВЕРШЕНИЯ (Polling)
                while True:
                    await asyncio.sleep(10) # Проверяем каждые 10 секунд

                    # Исправление: передаем id в метод get
                    interaction = await client.aio.interactions.get(id=interaction.id)

                    if interaction.status == "COMPLETED" or interaction.status == "SUCCEEDED":
                        break
                    elif interaction.status == "FAILED":
                        # Пытаемся получить текст ошибки
                        error_msg = getattr(interaction, 'error', 'Unknown error')
                        raise Exception(f"Deep Research failed with status {interaction.status}: {error_msg}")

                    print(f"Report {report_id} interaction status: {interaction.status}...")

                # ПОЛУЧЕНИЕ РЕЗУЛЬТАТА
                if not interaction.outputs:
                     error_msg = "Model returned empty interaction outputs."
                     print(f"Error processing report {report_id}: {error_msg}")
                     report.status = ReportStatus.FAILED
                     report.result_json = {"error": error_msg}
                     await db.commit()
                     return

                # Извлекаем текст (безопасный способ с fallback)
                try:
                    # Попытка 1: стандартная структура (content.parts[0].text)
                    response_text = interaction.outputs[-1].content.parts[0].text
                except (AttributeError, IndexError, TypeError):
                    try:
                        # Попытка 2: упрощенная структура (иногда бывает .text)
                        response_text = interaction.outputs[-1].text
                    except (AttributeError, IndexError):
                        # Попытка 3: строковое представление
                        response_text = str(interaction.outputs[-1])

            # 3. Parse JSON
            if not response_text:
                raise Exception("Empty response text received from interaction")

            # Clean up potential markdown formatting
            json_str = response_text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            elif json_str.startswith("```"):
                json_str = json_str[3:]

            if json_str.endswith("```"):
                json_str = json_str[:-3]

            json_str = json_str.strip()

            try:
                result_json = json.loads(json_str)
            except json.JSONDecodeError:
                # Fallback: Model might have returned just text despite instructions.
                result_json = {
                    "summary": "Model output was not strict JSON. See detailed analysis.",
                    "key_metrics": [],
                    "charts_data": [],
                    "detailed_analysis": response_text,
                    "sources": []
                }

            # 4. Save Result
            report.result_json = result_json
            report.status = ReportStatus.COMPLETED
            await db.commit()

        except Exception as e:
            # Log error
            print(f"Error processing report {report_id}: {e}")
            report.status = ReportStatus.FAILED
            report.result_json = {"error": str(e)}
            await db.commit()
