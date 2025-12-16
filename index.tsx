/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @name 1 0 Pro
 * @description Full protection + instant return + message to anyone who tries to pull you
 * @version 2.0.0
 */

// ==================== 10AntiMove Plugin ====================
const { Plugin, Settings, Flux } = window.Vencord;

const settings = new Settings("10AntiMove", {
    antiMove: { type: "boolean", default: true, description: "منع السحب" },
    notifySound: { type: "boolean", default: true, description: "صوت تنبيه" },
    autoDM: { type: "boolean", default: true, description: "DM تلقائي" },
    trollMode: { type: "boolean", default: false, description: "وضع استفزاز 😂" },
    lockRoom: { type: "boolean", default: true, description: "قفل الروم" },
    autoBlockAfter: { type: "number", default: 3, description: "حظر بعد كم محاولة" },
    ignoredUsers: { type: "string", default: "", description: "IDs متجاهلة" }
});

let lastChannelId = null;
const attempts = {};

function overlay(text) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #0f172a;
        color: #fff;
        padding: 12px 16px;
        border-radius: 10px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 10px 25px rgba(0,0,0,.4);
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

class AntiMovePlugin extends Plugin {
    start() {
        console.log("🛡️ 10AntiMove شغال");

        // ====== أمر /antimove ======
        this.registerCommand({
            name: "antimove",
            description: "تشغيل / إيقاف منع السحب",
            execute: () => {
                settings.store.antiMove = !settings.store.antiMove;
                return `🛡️ AntiMove: ${settings.store.antiMove ? "مفعل ✅" : "موقف ❌"}`;
            }
        });

        // ====== حماية الروم ======
        this.addListener("VOICE_STATE_UPDATE", async (data) => {
            const myId = window.DiscordNative?.getCurrentUser()?.id || data.userId;
            if (!myId || data.userId !== myId) return;

            if (data.channelId) lastChannelId = data.channelId;

            if (!settings.store.antiMove || !lastChannelId) return;

            const executorId = data?.member?.user?.id;
            if (!executorId) return;

            const ignored = settings.store.ignoredUsers.split(",").map(x => x.trim()).filter(Boolean);
            if (ignored.includes(executorId)) return;

            attempts[executorId] = (attempts[executorId] || 0) + 1;

            // رجوع فوري
            window.Vencord.findModule("VoiceActions")?.selectVoiceChannel(lastChannelId);

            // صوت
            if (settings.store.notifySound) {
                new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play();
            }

            // Overlay
            overlay(`🚨 محاولة سحب من <@${executorId}> (${attempts[executorId]})`);

            // DM لك
            const me = await window.Vencord.findModule("DMUtils")?.openPrivateChannel(myId);
            me?.sendMessage?.({
                content: `🛡️ محاولة سحب\n👤 <@${executorId}>\n🔢 العدد: ${attempts[executorId]}`
            });

            // DM له
            if (settings.store.autoDM) {
                const msg =
                    attempts[executorId] >= settings.store.autoBlockAfter
                        ? "⛔ تم حظرك تلقائيًا بسبب تكرار السحب."
                        : settings.store.trollMode
                            ? "😂 رجعت غصب… لا تحاول"
                            : "تنبيه: لا يمكن سحبي من الروم.";

                const him = await window.Vencord.findModule("DMUtils")?.openPrivateChannel(executorId);
                him?.sendMessage?.({ content: msg });
            }

            // حظر تلقائي
            if (attempts[executorId] >= settings.store.autoBlockAfter) {
                window.Vencord.findModule("RelationshipStore")?.addRelationship(executorId, 2);
            }

            console.log("🛡️ AntiMove", executorId, attempts[executorId]);
        });
    }

    stop() {
        console.log("🛑 10AntiMove توقف");
    }
}

export default AntiMovePlugin;
