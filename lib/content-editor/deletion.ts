import { CONFIG, type ContentKind, valuesFor } from "./contracts";
import { SUPPORTED_LOCALES } from "../locales";
import { randomUUID } from "node:crypto";
import { ContentError, fingerprint, readContent, type Store } from "./service";
import { HAS_IMPACT_BACKING_CAMPAIGNS } from "./site-capabilities";

export async function deleteContentSafely(db:Store,input:{kind:ContentKind;id:string;confirmation:string;revision?:string}) {
  if (!["campaigns","categories","blog"].includes(input.kind)) throw new ContentError("الحذف غير متاح لهذا النوع");
  return db.transaction(async tx=>{
    const row=await readContent(tx,input.kind,input.id);
    if(input.revision && input.revision!==fingerprint(row)) throw new ContentError("تغير المحتوى. أعد فتح نافذة الحذف لمراجعته.",409);
    const title=String(row.title || row.name || row.id).trim();
    if(!title || input.confirmation.trim()!==title) throw new ContentError("اكتب اسم المحتوى كاملًا لتأكيد الحذف");
    const exists=async(model:string,where:object)=>Boolean(await tx.model(model).findFirst({where,select:{id:true}}));
    const remove=async(model:string,where:object)=>{
      const delegate=tx.model(model);
      if(!delegate.deleteMany)throw new Error("Deletion unavailable");
      await delegate.deleteMany({where});
    };
    if(input.kind==="campaigns") {
      if(Number(row.currentAmount || 0)>0 || Number(row.baselineAmount || 0)>0 || await exists("donationItem",{campaignId:input.id}) || await exists("subscriptionItem",{campaignId:input.id}))
        throw new ContentError("لا يمكن حذف مشروع استقبل تبرعات أو له سجلات تبرع أو اشتراك مرتبطة. يمكنك أرشفته بدلًا من الحذف.",409);
      if(HAS_IMPACT_BACKING_CAMPAIGNS && await exists("impactCampaign",{campaignId:input.id})) throw new ContentError("مشروع الأثر يُدار من قسم الأثر",409);
    }
    if(input.kind==="categories") {
      if((Array.isArray(row.campaignIds) && row.campaignIds.length) || await exists("campaign",{categoryIds:{has:input.id}})) throw new ContentError("انقل المشاريع المرتبطة إلى تصنيف آخر قبل الحذف",409);
      if(Number(row.currentAmount || 0)>0 || Number(row.baselineAmount || 0)>0 || await exists("donationCategoryItem",{categoryId:input.id}) || await exists("subscriptionCategoryItem",{categoryId:input.id})) throw new ContentError("لا يمكن حذف تصنيف له تبرعات أو اشتراكات مرتبطة؛ يمكنك تعطيله.",409);
    }
    // Keep an editorial snapshot independently of the parent before removing authored text.
    const values=Object.fromEntries(SUPPORTED_LOCALES.map(locale=>[locale,valuesFor(input.kind,row,locale)]));
    await tx.model("contentEditorRevision").create({data:{kind:input.kind,entityId:input.id,revision:fingerprint(row),values:JSON.parse(JSON.stringify(values))}});
    if(input.kind==="campaigns") {
      await tx.model("campaign").update({where:{id:input.id},data:{isDeleted:true,isActive:false,editorArchived:true,editorVersion:randomUUID()}});
      await remove("cartItem",{campaignId:input.id});
    } else {
      await remove(CONFIG[input.kind].translationModel,{[CONFIG[input.kind].parentKey]:input.id});
      await remove(CONFIG[input.kind].model,{id:input.id});
    }
    if(input.kind!=="categories") await remove("superCategoryItem",{kind:input.kind==="blog"?"POST":"CAMPAIGN",refId:input.id});
    return {ok:true,title};
  });
}
