import { db } from "@/lib/db";

export const adminPermissions = [
  ["Customers.View", "Customers", "View", "View customer records"],
  ["Customers.Create", "Customers", "Create", "Create customer records"],
  ["Customers.Edit", "Customers", "Edit", "Edit customer records"],
  ["Customers.Delete", "Customers", "Delete", "Delete customer records"],
  ["Suppliers.View", "Suppliers", "View", "View supplier records"],
  ["Suppliers.Create", "Suppliers", "Create", "Create supplier records"],
  ["Suppliers.Edit", "Suppliers", "Edit", "Edit supplier records"],
  ["Suppliers.Delete", "Suppliers", "Delete", "Delete supplier records"],
  ["Invoices.View", "Invoices", "View", "View invoices"],
  ["Invoices.Create", "Invoices", "Create", "Create invoices"],
  ["Invoices.Edit", "Invoices", "Edit", "Edit invoices"],
  ["Invoices.Submit", "Invoices", "Submit", "Submit invoices for approval"],
  ["Invoices.Approve", "Invoices", "Approve", "Approve submitted invoices"],
  ["Invoices.Post", "Invoices", "Post", "Post approved invoices"],
  ["Payments.Record", "Payments", "Record", "Record customer payments"],
  ["Expenses.View", "Expenses", "View", "View expenses"],
  ["Expenses.Create", "Expenses", "Create", "Create expenses"],
  ["Expenses.Approve", "Expenses", "Approve", "Approve expenses"],
  ["Reports.View", "Reports", "View", "View reports"],
  ["Audit.View", "Audit", "View", "View audit trail"],
  ["Users.Manage", "Users", "Manage", "Manage users and invitations"],
  ["Roles.Manage", "Roles", "Manage", "Manage roles and permissions"],
  ["ReferenceData.Manage", "Reference Data", "Manage", "Manage lookup values"],
  ["Forms.Manage", "Forms", "Manage", "Manage configurable form fields"],
  ["Settings.Manage", "System Settings", "Manage", "Manage system configuration"],
  ["Database.View", "Database", "View", "Browse database tables"],
  ["SQL.Select", "SQL", "Select", "Run read-only SQL SELECT queries"],
  ["SQL.Insert", "SQL", "Insert", "Run SQL INSERT queries"],
  ["SQL.Update", "SQL", "Update", "Run SQL UPDATE queries"],
  ["SQL.Delete", "SQL", "Delete", "Run SQL DELETE queries"],
  ["SQL.Admin", "SQL", "Admin", "Unrestricted SQL administration"],
] as const;

const roleDefaults = [
  { id: "role_admin", name: "_ADMIN", description: "Full system administration access." },
  { id: "role_accountant", name: "_ACCOUNTANT", description: "Daily finance operations and posting." },
  { id: "role_approver", name: "_APPROVER", description: "Reviews and approves submitted finance documents." },
  { id: "role_auditor", name: "_AUDITOR", description: "Read-only audit, reporting, and compliance review." },
] as const;

const rolePermissionMap: Record<string, string[]> = {
  _ADMIN: adminPermissions.map(([key]) => key),
  _ACCOUNTANT: [
    "Customers.View",
    "Customers.Create",
    "Customers.Edit",
    "Suppliers.View",
    "Suppliers.Create",
    "Suppliers.Edit",
    "Invoices.View",
    "Invoices.Create",
    "Invoices.Edit",
    "Invoices.Submit",
    "Invoices.Post",
    "Payments.Record",
    "Expenses.View",
    "Expenses.Create",
    "Reports.View",
  ],
  _APPROVER: ["Invoices.View", "Invoices.Approve", "Expenses.View", "Expenses.Approve", "Reports.View", "Audit.View"],
  _AUDITOR: ["Customers.View", "Suppliers.View", "Invoices.View", "Expenses.View", "Reports.View", "Audit.View", "Database.View", "SQL.Select"],
};

const referenceGroups = [
  {
    key: "countries",
    name: "Countries",
    items: [
      ["AE", "United Arab Emirates"],
      ["SA", "Saudi Arabia"],
      ["QA", "Qatar"],
      ["OM", "Oman"],
    ],
  },
  {
    key: "currencies",
    name: "Currencies",
    items: [
      ["AED", "UAE Dirham"],
      ["USD", "US Dollar"],
      ["EUR", "Euro"],
    ],
  },
  {
    key: "departments",
    name: "Departments",
    items: [
      ["FIN", "Finance"],
      ["OPS", "Operations"],
      ["SALES", "Sales"],
      ["ADMIN", "Administration"],
    ],
  },
  {
    key: "user_statuses",
    name: "User Statuses",
    items: [
      ["PENDING", "Pending"],
      ["ACTIVE", "Active"],
      ["SUSPENDED", "Suspended"],
      ["DISABLED", "Disabled"],
    ],
  },
  {
    key: "user_roles",
    name: "User Roles",
    items: [
      ["ADMIN", "Admin"],
      ["ACCOUNTANT", "Accountant"],
      ["APPROVER", "Approver"],
      ["VIEWER", "Viewer"],
    ],
  },
  {
    key: "invoice_statuses",
    name: "Invoice Statuses",
    items: [
      ["DRAFT", "Draft"],
      ["SUBMITTED", "Submitted"],
      ["APPROVED", "Approved"],
      ["POSTED", "Posted"],
      ["PAID", "Paid"],
    ],
  },
  {
    key: "expense_statuses",
    name: "Expense Statuses",
    items: [
      ["DRAFT", "Draft"],
      ["SUBMITTED", "Submitted"],
      ["APPROVED", "Approved"],
      ["PAID", "Paid"],
    ],
  },
  {
    key: "payment_methods",
    name: "Payment Methods",
    items: [
      ["BANK_TRANSFER", "Bank Transfer"],
      ["CARD", "Card"],
      ["CASH", "Cash"],
      ["CHEQUE", "Cheque"],
    ],
  },
  {
    key: "expense_categories",
    name: "Expense Categories",
    items: [
      ["OFFICE", "Office"],
      ["TRAVEL", "Travel"],
      ["SOFTWARE", "Software"],
      ["PROFESSIONAL", "Professional Services"],
    ],
  },
  {
    key: "tax_codes",
    name: "Tax Codes",
    items: [
      ["VAT5", "VAT 5%"],
      ["ZERO", "Zero Rated"],
      ["EXEMPT", "Exempt"],
    ],
  },
] as const;

const systemSettings = [
  ["tax.vat_rate", "Tax", "VAT %", "5", "NUMBER", "Default UAE VAT percentage."],
  ["invoice.prefix", "Invoices", "Invoice Number Prefix", "INV-", "TEXT", "Prefix used for invoice numbering."],
  ["company.default_currency", "Company Defaults", "Default Currency", "AED", "TEXT", "Default company currency."],
  ["company.default_timezone", "Company Defaults", "Default Timezone", "Asia/Dubai", "TEXT", "Default company timezone."],
  ["email.from_name", "Email Settings", "From Name", "XAI Books", "TEXT", "Transactional email sender name."],
  ["approvals.enabled", "Approval Settings", "Approvals Enabled", "true", "BOOLEAN", "Require approval workflow for configured documents."],
] as const;

const formTemplates = [
  {
    key: "users",
    name: "Users",
    description: "Fields shown when creating and editing user accounts.",
    fields: [
      ["identity", "username", "Username", "USER_ENTRY", "TEXT", null],
      ["identity", "firstName", "First Name", "MANDATORY", "TEXT", null],
      ["identity", "lastName", "Last Name", "MANDATORY", "TEXT", null],
      ["identity", "email", "Email Address", "MANDATORY", "EMAIL", null],
      ["identity", "phone", "Phone Number", "USER_ENTRY", "PHONE", null],
      ["work", "jobTitle", "Job Title", "USER_ENTRY", "TEXT", null],
      ["security", "status", "Account Status", "MANDATORY", "LIST", "user_statuses"],
      ["security", "role", "Default Role", "MANDATORY", "LIST", "user_roles"],
    ],
  },
  {
    key: "customers",
    name: "Customers",
    description: "Fields shown on customer forms and customer profiles.",
    fields: [
      ["identity", "name", "Customer Name", "MANDATORY", "TEXT", null],
      ["identity", "contactPerson", "Contact Person", "USER_ENTRY", "TEXT", null],
      ["contact", "email", "Email", "USER_ENTRY", "EMAIL", null],
      ["contact", "phone", "Phone", "USER_ENTRY", "PHONE", null],
      ["contact", "address", "Address", "USER_ENTRY", "TEXTAREA", null],
      ["tax", "trn", "Tax Registration Number", "USER_ENTRY", "TEXT", null],
    ],
  },
  {
    key: "suppliers",
    name: "Suppliers",
    description: "Fields shown on supplier forms and supplier profiles.",
    fields: [
      ["identity", "name", "Supplier Name", "MANDATORY", "TEXT", null],
      ["identity", "contactPerson", "Contact Person", "USER_ENTRY", "TEXT", null],
      ["contact", "email", "Email", "USER_ENTRY", "EMAIL", null],
      ["contact", "phone", "Phone", "USER_ENTRY", "PHONE", null],
      ["contact", "address", "Address", "USER_ENTRY", "TEXTAREA", null],
      ["tax", "trn", "Tax Registration Number", "USER_ENTRY", "TEXT", null],
    ],
  },
  {
    key: "invoices",
    name: "Invoices",
    description: "Fields used for UAE VAT invoice entry and approval.",
    fields: [
      ["header", "customerId", "Customer", "MANDATORY", "LIST", "customers"],
      ["header", "issueDate", "Issue Date", "MANDATORY", "DATE", null],
      ["header", "dueDate", "Due Date", "USER_ENTRY", "DATE", null],
      ["header", "status", "Status", "DISPLAY_ONLY", "LIST", "invoice_statuses"],
      ["details", "notes", "Notes", "USER_ENTRY", "TEXTAREA", null],
      ["totals", "subtotal", "Subtotal", "DISPLAY_ONLY", "MONEY", null],
      ["totals", "vatTotal", "VAT Total", "DISPLAY_ONLY", "MONEY", null],
      ["totals", "total", "Total", "DISPLAY_ONLY", "MONEY", null],
    ],
  },
  {
    key: "payments",
    name: "Payments",
    description: "Fields used when recording customer payments.",
    fields: [
      ["payment", "invoiceId", "Invoice", "MANDATORY", "LIST", "invoices"],
      ["payment", "amount", "Amount", "MANDATORY", "MONEY", null],
      ["payment", "method", "Payment Method", "MANDATORY", "LIST", "payment_methods"],
      ["payment", "paymentDate", "Payment Date", "MANDATORY", "DATE", null],
      ["payment", "reference", "Reference", "USER_ENTRY", "TEXT", null],
      ["payment", "notes", "Notes", "USER_ENTRY", "TEXTAREA", null],
    ],
  },
  {
    key: "expenses",
    name: "Expenses",
    description: "Fields used when entering and approving expenses.",
    fields: [
      ["expense", "supplierId", "Supplier", "MANDATORY", "LIST", "suppliers"],
      ["expense", "category", "Expense Category", "MANDATORY", "LIST", "expense_categories"],
      ["expense", "amount", "Amount", "MANDATORY", "MONEY", null],
      ["expense", "expenseDate", "Expense Date", "MANDATORY", "DATE", null],
      ["expense", "status", "Status", "DISPLAY_ONLY", "LIST", "expense_statuses"],
      ["expense", "notes", "Notes", "USER_ENTRY", "TEXTAREA", null],
    ],
  },
  {
    key: "company",
    name: "Company",
    description: "Fields shown in company settings and company profile.",
    fields: [
      ["identity", "name", "Company Name", "MANDATORY", "TEXT", null],
      ["identity", "website", "Website", "USER_ENTRY", "URL", null],
      ["contact", "email", "Email", "USER_ENTRY", "EMAIL", null],
      ["contact", "phone", "Phone", "USER_ENTRY", "PHONE", null],
      ["contact", "address", "Address", "USER_ENTRY", "TEXTAREA", null],
      ["contact", "city", "City", "USER_ENTRY", "TEXT", null],
      ["contact", "country", "Country", "MANDATORY", "LIST", "countries"],
      ["tax", "taxNumber", "Tax Registration Number", "USER_ENTRY", "TEXT", null],
      ["defaults", "currency", "Currency", "MANDATORY", "LIST", "currencies"],
      ["defaults", "timezone", "Time Zone", "MANDATORY", "TEXT", null],
    ],
  },
] as const;

export async function ensureAdminDefaults() {
  const roles = await Promise.all(
    roleDefaults.map((role) =>
      db.adminRole.upsert({
        where: { name: role.name },
        update: { description: role.description, systemRole: true, status: "SYSTEM" },
        create: { id: role.id, name: role.name, description: role.description, systemRole: true, status: "SYSTEM" },
      }),
    ),
  );

  const permissions = await Promise.all(
    adminPermissions.map(([key, module, action, description]) =>
      db.permission.upsert({
        where: { key },
        update: { action, description, module },
        create: { action, description, key, module },
      }),
    ),
  );

  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
  for (const role of roles) {
    const keys = rolePermissionMap[role.name] ?? [];
    for (const key of keys) {
      const permissionId = permissionByKey.get(key);
      if (!permissionId) continue;
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { permissionId, roleId: role.id } },
        update: {},
        create: { permissionId, roleId: role.id },
      });
    }
  }

  await Promise.all(
    referenceGroups.map(async (group) => {
      const createdGroup = await db.referenceDataGroup.upsert({
        where: { key: group.key },
        update: { active: true, name: group.name, systemGroup: true },
        create: { active: true, key: group.key, name: group.name, systemGroup: true },
      });
      await Promise.all(
        group.items.map(([code, label], index) =>
          db.referenceDataItem.upsert({
            where: { groupId_code: { code, groupId: createdGroup.id } },
            update: { active: true, label, sortOrder: (index + 1) * 10 },
            create: { active: true, code, groupId: createdGroup.id, label, sortOrder: (index + 1) * 10 },
          }),
        ),
      );
    }),
  );

  await Promise.all(
    systemSettings.map(([key, module, label, value, valueType, description]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { description, label, module },
        create: { description, key, label, module, value, valueType },
      }),
    ),
  );

  await Promise.all(
    formTemplates.map(async (template) => {
      const createdTemplate = await db.formTemplate.upsert({
        where: { key: template.key },
        update: { active: true, description: template.description, name: template.name },
        create: { active: true, description: template.description, key: template.key, name: template.name },
      });

      await Promise.all(
        template.fields.map(([groupTitle, fieldName, fieldLabel, entryMode, fieldType, listKey], index) =>
          db.formFieldDefinition.upsert({
            where: { templateId_fieldName: { fieldName, templateId: createdTemplate.id } },
            update: {
              active: true,
              entryMode,
              fieldLabel,
              fieldType,
              groupTitle,
              listKey,
              sortOrder: (index + 1) * 10,
              systemField: true,
            },
            create: {
              active: true,
              entryMode,
              fieldLabel,
              fieldName,
              fieldType,
              groupTitle,
              listKey,
              sortOrder: (index + 1) * 10,
              systemField: true,
              templateId: createdTemplate.id,
            },
          }),
        ),
      );
    }),
  );

  const existingAssignments = await db.userRoleAssignment.count();
  if (existingAssignments === 0) {
    const users = await db.user.findMany({ select: { id: true, role: true } });
    const roleByName = new Map(roles.map((role) => [role.name, role.id]));
    await Promise.all(
      users.map((user) => {
        const roleName = user.role === "ADMIN" ? "_ADMIN" : user.role === "APPROVER" ? "_APPROVER" : user.role === "VIEWER" ? "_AUDITOR" : "_ACCOUNTANT";
        const roleId = roleByName.get(roleName) ?? roleByName.get("_ACCOUNTANT");
        if (!roleId) return Promise.resolve();
        return db.userRoleAssignment.upsert({
          where: { userId_roleId: { roleId, userId: user.id } },
          update: { active: true, revokedAt: null },
          create: { active: true, roleId, userId: user.id },
        });
      }),
    );
  }
}
