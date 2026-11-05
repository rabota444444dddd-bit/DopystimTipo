// ПРИКЛАД серверу-посередника для справжнього ШІ (Supabase Edge Function). Версія 2: справжній діалог + пам’ять.
// УВАГА: це шаблон. Він не перевірявся на вашому проєкті: розгорніть, протестуйте й за потреби поправте.
//
// Навіщо потрібен: ключ ШІ-сервісу НЕ можна класти в браузерний код (його вкрадуть).
// Тому сайт звертається до цієї функції, а ключ лежить лише на сервері.
//
// Розгортання (коротко):
//   1) Встановіть Supabase CLI, увійдіть:  supabase login   і  supabase link --project-ref <ваш-ref>
//   2) Покладіть цей файл у  supabase/functions/ai-assistant/index.ts
//   3) Секрети:  supabase secrets set ANTHROPIC_API_KEY=... AI_MODEL=claude-sonnet-5-5
//   4) Розгорніть:  supabase functions deploy ai-assistant
//   5) У config.js:  AI_ENDPOINT:'https://<ваш-ref>.supabase.co/functions/v1/ai-assistant'
// Запит вважається дозволеним, якщо передано JWT користувача Supabase (сайт додає його автоматично).
//
// Що нового у v2:
//   • історія розмови передається як справжній діалог (чергування user/assistant), а не одним текстом;
//   • контекст (задачі відділу, пам’ять користувача, остання згадана задача) іде в системному повідомленні;
//   • ШІ може ставити уточнювальні запитання, пропонувати «followups» (кнопки-підказки) та дію «remember».

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Ти — розмовний помічник з управління задачами в будівельній компанії (відділ, проєкти, задачі, підзадачі).
Ти ведеш ДІАЛОГ: пам’ятаєш попередні репліки, розумієш «її», «цю задачу», «а на тиждень?», «так, зроби» з огляду на історію та поле last_mentioned.
Відповідай українською, дружньо, коротко й по справі. Поточну дату й дані відділу бачиш у КОНТЕКСТІ (поле today — сьогодні).
Поле memory — те, чого користувач навчив помічника (notes — нотатки, macros — скорочення, learned_plans — улюблені плани, corrections — його виправлення твоїх відповідей). Враховуй це й не повторюй помилок із corrections.

Поверни ТІЛЬКИ JSON без пояснень поза ним, формат:
{"reply":"текст відповіді користувачу","actions":[ ... ],"followups":["коротка підказка-відповідь 1","підказка 2"]}
• reply — звичайна розмовна відповідь. Можна **жирним** виділяти головне.
• followups — 0–3 короткі (до 6 слів) варіанти, що користувач може натиснути далі. Лише якщо вони справді корисні.
• Якщо даних бракує або запит неоднозначний — постав ОДНЕ уточнювальне запитання в reply і не додавай actions.
• Якщо користувач ставить загальне запитання, дякує, жартує або просить пораду — просто відповідай у reply, без actions.

Дії (actions) виконуватиме сайт після підтвердження користувача (кнопка або слово «так»). Дозволені типи (використовуй лише id із КОНТЕКСТУ):
{"type":"create_task","title":"","start":"YYYY-MM-DD","end":"YYYY-MM-DD","who":["userId"],"project":"projectId","cat":"categoryId","subs":["підзадача"]}
{"type":"add_subtasks","task":"taskId","subs":["..."]}
{"type":"set_status","task":"taskId","status":"Не почато|Постійна задача|В процесі|Виконано"}
{"type":"set_dates","task":"taskId","start":"YYYY-MM-DD","end":"YYYY-MM-DD"}
{"type":"shift_dates","task":"taskId","days":3}
{"type":"assign","task":"taskId","who":["userId"],"replace":false}
{"type":"comment","task":"taskId","text":"","to":["userId"]}
{"type":"archive","task":"taskId"}
{"type":"create_project","name":""}
{"type":"create_category","name":""}
{"type":"create_milestone","project":"projectId","name":"","date":"YYYY-MM-DD","task":"текст автозадачі"}
{"type":"set_priority","task":"taskId","pri":"high|mid|low"}
{"type":"set_category","task":"taskId","cat":"categoryId"}
{"type":"remember","text":"коротка нотатка"}  — ЛИШЕ коли користувач прямо просить щось запам’ятати.

Якщо питають про план на день/тиждень/місяць — розпиши його у reply за задачами з КОНТЕКСТУ й, якщо доречно, запропонуй дії set_dates.
Нічого не вигадуй: використовуй лише id, що є в КОНТЕКСТІ. Не видаляй задачі.
Відносні дати («завтра», «у п’ятницю», «через тиждень») перераховуй від поля today у КОНТЕКСТІ.
Повідомлення виду «(Система: ...)» в історії — службові: вони повідомляють, що користувач підтвердив і виконав твої дії. Не цитуй їх, а враховуй.
Не пропонуй більше 15 дій за раз. Для порад і аналізу використовуй reply; actions — лише коли користувач просить щось змінити або створити.`;

type Turn = { role: string; text: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { message, history = [], context } = await req.json();

    // 1) Справжній діалог: чергуємо user/assistant, зливаємо сусідні репліки однієї ролі.
    const msgs: { role: "user" | "assistant"; content: string }[] = [];
    const push = (role: "user" | "assistant", text: string) => {
      const t = String(text ?? "").slice(0, 3000).trim();
      if (!t) return;
      const last = msgs[msgs.length - 1];
      if (last && last.role === role) last.content += "\n" + t;
      else msgs.push({ role, content: t });
    };
    for (const h of (history as Turn[]).slice(-16)) push(h.role === "assistant" ? "assistant" : "user", h.text);
    // Клієнт уже додає поточне повідомлення в history; якщо ні — додаємо самі.
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    if (!lastUser || !lastUser.content.endsWith(String(message ?? "").trim())) push("user", String(message ?? ""));
    while (msgs.length && msgs[0].role !== "user") msgs.shift();   // API вимагає починати з user
    if (!msgs.length) push("user", String(message ?? "") || "Привіт");

    // 2) Контекст — у системне повідомлення (він оновлюється щоразу, історія лишається чистою).
    const ctx = JSON.stringify(context ?? {}).slice(0, 60000);
    const system = SYSTEM + "\n\nКОНТЕКСТ (JSON):\n" + ctx;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "claude-sonnet-5-5",
        max_tokens: 2000,
        system,
        messages: msgs,
      }),
    });
    const j = await r.json();
    if (!r.ok || j.error) {
      return new Response(JSON.stringify({ reply: "ШІ-сервіс повернув помилку: " + (j.error?.message ?? r.status), actions: [] }),
        { headers: { ...cors, "content-type": "application/json" } });
    }
    const text: string = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    let out: { reply: string; actions: unknown[]; followups?: unknown[] } = { reply: text, actions: [] };
    if (m) { try { out = JSON.parse(m[0]); } catch (_) { /* лишаємо текст як є */ } }
    return new Response(JSON.stringify(out), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ reply: "Помилка сервера ШІ: " + (e as Error).message, actions: [] }),
      { headers: { ...cors, "content-type": "application/json" } });
  }
});
