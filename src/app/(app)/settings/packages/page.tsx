import { eq } from "drizzle-orm";
import { SectionHeader } from "@/components/settings/Forms";
import { PackagesForm } from "@/components/settings/PackagesForm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export default async function PackagesSettings() {
  const session = await auth();
  const presets = await db().query.parcelPresets.findMany({ where: eq(schema.parcelPresets.accountId, session!.user.accountId), orderBy: schema.parcelPresets.createdAt });
  return (
    <>
      <SectionHeader title="Saved packages" blurb="The boxes and mailers you use every day, one click away on the Ship page." />
      <PackagesForm presets={presets} />
    </>
  );
}
