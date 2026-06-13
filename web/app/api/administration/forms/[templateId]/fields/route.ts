import { NextRequest, NextResponse } from "next/server";
import { requestContext, requireUser, validationError } from "@/lib/api-utils";
import { logAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { formFieldMutationSchema } from "@/lib/form-template-validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { error, session } = await requireUser();
  if (error) return error;

  const { templateId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = formFieldMutationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const template = await db.formTemplate.findUnique({ where: { id: templateId }, select: { id: true, key: true } });
  if (!template) return NextResponse.json({ error: "Form template not found." }, { status: 404 });

  const duplicate = await db.formFieldDefinition.findUnique({
    where: { templateId_fieldName: { fieldName: parsed.data.fieldName, templateId } },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ error: "Field name already exists on this form." }, { status: 409 });

  if (parsed.data.fieldType === "LIST" && parsed.data.listKey) {
    const list = await db.referenceDataGroup.findUnique({ where: { key: parsed.data.listKey }, select: { id: true } });
    if (!list) return NextResponse.json({ error: "Assigned list was not found." }, { status: 400 });
  }

  const field = await db.formFieldDefinition.create({
    data: {
      ...parsed.data,
      defaultValue: parsed.data.defaultValue || null,
      dependsOn: parsed.data.dependsOn || null,
      formula: parsed.data.formula || null,
      groupTitle: parsed.data.groupTitle || null,
      listKey: parsed.data.listKey || null,
      templateId,
      updatedById: session!.user.id,
    },
  });

  const { ip, userAgent } = await requestContext();
  await logAuditEvent({
    action: "FORM_FIELD_CREATED" as never,
    email: session!.user.email,
    ip,
    metadata: { fieldName: field.fieldName, template: template.key },
    userAgent,
    userId: session!.user.id,
  });

  return NextResponse.json({ field }, { status: 201 });
}
