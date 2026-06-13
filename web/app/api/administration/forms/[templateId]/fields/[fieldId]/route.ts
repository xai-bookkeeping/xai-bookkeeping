import { NextRequest, NextResponse } from "next/server";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { formFieldPatchSchema } from "@/lib/form-template-validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string; templateId: string }> },
) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { fieldId, templateId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = formFieldPatchSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const existing = await db.formFieldDefinition.findFirst({
    where: { id: fieldId, templateId },
    include: { template: { select: { key: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Field not found." }, { status: 404 });

  if (parsed.data.fieldName && parsed.data.fieldName !== existing.fieldName) {
    const duplicate = await db.formFieldDefinition.findUnique({
      where: { templateId_fieldName: { fieldName: parsed.data.fieldName, templateId } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "Field name already exists on this form." }, { status: 409 });
  }

  if (parsed.data.fieldType === "LIST" && parsed.data.listKey) {
    const list = await db.referenceDataGroup.findUnique({ where: { key: parsed.data.listKey }, select: { id: true } });
    if (!list) return NextResponse.json({ error: "Assigned list was not found." }, { status: 400 });
  }

  const field = await db.formFieldDefinition.update({
    where: { id: fieldId },
    data: {
      ...parsed.data,
      defaultValue: parsed.data.defaultValue === undefined ? undefined : parsed.data.defaultValue || null,
      dependsOn: parsed.data.dependsOn === undefined ? undefined : parsed.data.dependsOn || null,
      formula: parsed.data.formula === undefined ? undefined : parsed.data.formula || null,
      groupTitle: parsed.data.groupTitle === undefined ? undefined : parsed.data.groupTitle || null,
      listKey: parsed.data.listKey === undefined ? undefined : parsed.data.listKey || null,
      updatedById: session!.user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "FORM_FIELD_UPDATED" as never,
    email: session!.user.email,
    ip,
    metadata: { fieldName: field.fieldName, template: existing.template.key },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ field });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string; templateId: string }> },
) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { fieldId, templateId } = await params;
  const existing = await db.formFieldDefinition.findFirst({
    where: { id: fieldId, templateId },
    include: { template: { select: { key: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Field not found." }, { status: 404 });

  const field = existing.systemField
    ? await db.formFieldDefinition.update({
        where: { id: fieldId },
        data: { active: false, entryMode: "NOT_DISPLAYED", updatedById: session!.user.id },
      })
    : await db.formFieldDefinition.delete({ where: { id: fieldId } });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "FORM_FIELD_DELETED" as never,
    email: session!.user.email,
    ip,
    metadata: { fieldName: existing.fieldName, template: existing.template.key },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ field });
}
