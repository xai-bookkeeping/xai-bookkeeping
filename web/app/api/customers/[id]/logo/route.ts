import { requireUser } from "@/lib/api-utils";
import { deletePartyProfileImage, uploadPartyProfileImage } from "@/lib/party-profile-images";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { error, session } = await requireUser();
  if (error) return error;
  const { id } = await params;

  return uploadPartyProfileImage({
    id,
    image: "logo",
    party: "customer",
    request,
    sessionUser: { email: session.user.email, id: session.user.id },
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const { error, session } = await requireUser();
  if (error) return error;
  const { id } = await params;

  return deletePartyProfileImage({
    id,
    image: "logo",
    party: "customer",
    sessionUser: { email: session.user.email, id: session.user.id },
  });
}
