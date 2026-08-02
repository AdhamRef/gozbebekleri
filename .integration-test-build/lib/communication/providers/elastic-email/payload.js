"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELASTIC_EMAIL_ENDPOINT = void 0;
exports.buildElasticEmailPayload = buildElasticEmailPayload;
exports.readElasticEmailMessageId = readElasticEmailMessageId;
const types_1 = require("./types");
/**
 * Pure request/response shaping for the Elastic Email v4 transactional endpoint. Kept free of any
 * runtime-config or Prisma import so it can be unit-tested without a database or server-only module.
 */
exports.ELASTIC_EMAIL_ENDPOINT = "https://api.elasticemail.com/v4/emails/transactional";
function buildElasticEmailPayload(input, sender) {
    const body = [{ ContentType: "HTML", Content: input.html, Charset: "utf-8" }];
    if (input.text)
        body.push({ ContentType: "PlainText", Content: input.text, Charset: "utf-8" });
    const content = {
        From: (0, types_1.formatSenderIdentity)(sender.email, sender.name),
        Subject: input.subject,
        Body: body,
    };
    if (input.replyTo)
        content.ReplyTo = input.replyTo;
    if (input.toName)
        content.To = [(0, types_1.formatSenderIdentity)(input.to, input.toName)];
    return {
        Recipients: { To: [input.to] },
        Content: content,
        Options: {
            TrackOpens: input.trackOpens ?? true,
            TrackClicks: input.trackClicks ?? true,
            ...(input.channelName ? { ChannelName: input.channelName } : {}),
        },
    };
}
/** Read the provider message id from a v4 response, tolerating casing differences. */
function readElasticEmailMessageId(body) {
    if (!body || typeof body !== "object")
        return null;
    const row = body;
    for (const key of ["MessageID", "MessageId", "messageId", "messageid", "TransactionID", "TransactionId", "transactionId"]) {
        const value = row[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return null;
}
