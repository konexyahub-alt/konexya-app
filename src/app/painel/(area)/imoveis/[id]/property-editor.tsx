"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { Button, buttonClasses, Card, Chip, HelpTip, Icon, IconButton, SectionTitle, Tag, TextField, useToast } from "@/components/ui";
import { PinMap } from "@/components/property/pin-map";
import { cn } from "@/lib/cn";
import {
  AMENITIES,
  PETS_LABELS,
  PURPOSE_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  TYPE_LABELS,
  missingSealItems,
  sealChecklist,
  type PetsPolicy,
  type Property,
  type PropertyStatus,
  type PropertyType,
  type Purpose,
  type SealRules,
} from "@/lib/property";
import { STEP_LABELS, parseBRNumber, publishProblems } from "@/lib/property-form";
import { createClient } from "@/lib/supabase/client";
import { addPhotos, removePhoto, reorderPhotos, saveStep, setStatus } from "../actions";

type Photo = { id: string; url: string; isCover: boolean };
type Broker = { id: string; name: string; creci: string | null };

type Values = {
  purpose: Purpose;
  type: PropertyType;
  title: string;
  street: string;
  street_number: string;
  complement: string;
  neighborhood: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  pin_confirmed: boolean;
  price: string;
  condo_fee: string;
  iptu_monthly: string;
  area_m2: string;
  bedrooms: string;
  suites: string;
  bathrooms: string;
  parking_spots: string;
  pets: PetsPolicy | "";
  furnished: "sim" | "nao" | "";
  floor: string;
  view: string;
  amenities: string[];
  tour_url: string;
  description: string;
  broker_id: string;
};

const num = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));
const int = (v: number | null) => (v === null ? "" : String(v));

function initialValues(p: Property): Values {
  return {
    purpose: p.purpose,
    type: p.type,
    title: p.title ?? "",
    street: p.street ?? "",
    street_number: p.street_number ?? "",
    complement: p.complement ?? "",
    neighborhood: p.neighborhood ?? "",
    postal_code: p.postal_code ?? "",
    lat: p.lat,
    lng: p.lng,
    pin_confirmed: p.pin_confirmed,
    price: p.price === null ? "" : new Intl.NumberFormat("pt-BR").format(Number(p.price)),
    condo_fee: num(p.condo_fee),
    iptu_monthly: num(p.iptu_monthly),
    area_m2: num(p.area_m2),
    bedrooms: int(p.bedrooms),
    suites: int(p.suites),
    bathrooms: int(p.bathrooms),
    parking_spots: int(p.parking_spots),
    pets: p.pets ?? "",
    furnished: p.furnished === null ? "" : p.furnished ? "sim" : "nao",
    floor: int(p.floor),
    view: p.view ?? "",
    amenities: p.amenities,
    tour_url: p.tour_url ?? "",
    description: p.description ?? "",
    broker_id: p.broker_id ?? "",
  };
}

const STEP_FIELDS: (keyof Values)[][] = [
  ["purpose", "type", "title", "street", "street_number", "complement", "neighborhood", "postal_code", "lat", "lng", "pin_confirmed"],
  ["price", "condo_fee", "iptu_monthly", "area_m2", "bedrooms", "suites", "bathrooms", "parking_spots"],
  ["pets", "furnished", "floor", "view", "amenities"],
  ["tour_url"],
  ["description", "broker_id"],
];

export function PropertyEditor({
  property,
  photos: initialPhotos,
  agencyId,
  brokers,
  sealRules,
}: {
  property: Property;
  photos: Photo[];
  agencyId: string;
  brokers: Broker[];
  sealRules: SealRules;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() => initialValues(property));
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [status, setStatusState] = useState<PropertyStatus>(property.status);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const checklist = useMemo(
    () =>
      sealChecklist(
        {
          photoCount: photos.length,
          area_m2: parseBRNumber(values.area_m2),
          price: parseBRNumber(values.price),
          condo_fee: parseBRNumber(values.condo_fee),
          iptu_monthly: parseBRNumber(values.iptu_monthly),
          description: values.description,
          pin_confirmed: values.pin_confirmed,
        },
        sealRules,
      ),
    [photos.length, values, sealRules],
  );
  const missing = missingSealItems(checklist);

  async function save(target: number): Promise<boolean> {
    const payload = Object.fromEntries(STEP_FIELDS[step].map((k) => [k, values[k]]));
    const result = await saveStep(property.id, step, payload);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error ?? "Confira os campos destacados.");
      return false;
    }
    setErrors({});
    setFormError(undefined);
    setStep(target);
    return true;
  }

  const go = (target: number) => startTransition(async () => void (await save(target)));

  const changeStatus = (next: PropertyStatus, message: string) =>
    startTransition(async () => {
      if (!(await save(step))) return;
      const r = await setStatus(property.id, next);
      if (!r.ok) {
        setFormError(r.error);
        return;
      }
      setStatusState(next);
      showToast(message);
      router.refresh();
    });

  const saveDraft = () =>
    startTransition(async () => {
      if (await save(step)) showToast("Salvo");
    });

  const publishBlockers = publishProblems({
    title: values.title.trim() || null,
    price: parseBRNumber(values.price),
    neighborhood: values.neighborhood.trim() || null,
  });

  return (
    <div className="grid gap-7 xl:grid-cols-[1fr_300px]">
      <div className="grid min-w-0 content-start gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-tight">{values.title.trim() || "Novo imóvel"}</h1>
          <Tag tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Tag>
        </div>

        <ol className="grid grid-cols-5 gap-1.5" aria-label="Passos do cadastro">
          {STEP_LABELS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => go(i)}
                disabled={pending}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "grid w-full gap-1.5 text-left text-xs font-semibold",
                  i === step ? "text-black" : i < step ? "text-muted" : "text-muted-2",
                )}
              >
                <i className={cn("block h-1 rounded-sm", i === step ? "bg-black" : i < step ? "bg-muted" : "bg-paper-2")} />
                <span className="hidden sm:block">
                  {i + 1}. {label}
                </span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="grid gap-5">
          {step === 0 ? <StepBasic values={values} set={set} errors={errors} /> : null}
          {step === 1 ? <StepValues values={values} set={set} errors={errors} /> : null}
          {step === 2 ? <StepFeatures values={values} set={set} errors={errors} /> : null}
          {step === 3 ? (
            <StepPhotos
              propertyId={property.id}
              agencyId={agencyId}
              photos={photos}
              setPhotos={setPhotos}
              values={values}
              set={set}
              errors={errors}
              onError={setFormError}
            />
          ) : null}
          {step === 4 ? <StepDescription values={values} set={set} errors={errors} brokers={brokers} minChars={sealRules.minDescriptionChars} /> : null}
        </div>

        {formError ? (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-bad">
            <Icon name="alert" size="sm" /> {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={saveDraft}
            disabled={pending}
            className="min-h-touch text-sm font-semibold underline underline-offset-4"
          >
            {status === "rascunho" ? "Salvar como rascunho" : "Salvar"}
          </button>
          <div className="flex flex-wrap gap-2.5">
            {step > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => go(step - 1)} disabled={pending}>
                Voltar
              </Button>
            ) : null}
            {step < STEP_LABELS.length - 1 ? (
              <Button size="sm" onClick={() => go(step + 1)} loading={pending}>
                Continuar
              </Button>
            ) : status === "publicado" ? (
              <Button variant="secondary" size="sm" onClick={() => changeStatus("pausado", "Anúncio pausado")} loading={pending}>
                Pausar anúncio
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => changeStatus("publicado", "Imóvel publicado")}
                loading={pending}
                disabled={publishBlockers.length > 0}
              >
                Publicar
              </Button>
            )}
          </div>
        </div>
        {step === STEP_LABELS.length - 1 && status !== "publicado" && publishBlockers.length ? (
          <p className="text-[13px] text-muted">Para publicar: {publishBlockers.join(" ")}</p>
        ) : null}
        {status === "publicado" || status === "pausado" ? (
          <StatusActions status={status} pending={pending} onChange={changeStatus} propertyId={property.id} />
        ) : null}
      </div>

      <aside className="h-fit xl:sticky xl:top-6">
        <Card className="grid gap-1.5">
          <SectionTitle className="flex items-center gap-1.5">
            Selo Anúncio completo
            <HelpTip label="Selo Anúncio completo">
              O cliente vê o selo na ficha do imóvel. Na ordem das recomendações, ele só desempata imóveis com a mesma
              compatibilidade: não sobe um imóvel que combina menos com o cliente.
            </HelpTip>
          </SectionTitle>
          <p className="text-[13px]">
            {missing === 0 ? (
              <b className="text-ok">Este anúncio tem o selo.</b>
            ) : (
              <>
                <b>{missing === 1 ? "Falta 1 item" : `Faltam ${missing} itens`}</b> para o selo Anúncio completo.
              </>
            )}
          </p>
          <ul className="grid gap-1 py-1">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5 py-1 text-[13px]">
                <Icon name={item.done ? "check" : "clock"} className={item.done ? "text-ok" : "text-muted-2"} />
                <span className={item.done ? "" : "text-muted"}>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-2">Imóveis com selo ganham um pequeno destaque nas recomendações.</p>
        </Card>
      </aside>
    </div>
  );
}

type StepProps = {
  values: Values;
  set: <K extends keyof Values>(key: K, value: Values[K]) => void;
  errors: Record<string, string>;
};

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <fieldset className="grid gap-1.5 text-[12.5px] font-semibold">
      <legend className="mb-1.5">{label}</legend>
      {children}
      {error ? <p className="font-semibold text-bad">{error}</p> : null}
    </fieldset>
  );
}

function StepBasic({ values, set, errors }: StepProps) {
  const address = [values.street, values.street_number, values.neighborhood].filter(Boolean).join(", ");
  return (
    <>
      <Field label="Finalidade">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PURPOSE_LABELS) as Purpose[]).map((p) => (
            <Chip key={p} selected={values.purpose === p} onClick={() => set("purpose", p)}>
              {PURPOSE_LABELS[p]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Tipo">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as PropertyType[]).map((t) => (
            <Chip key={t} selected={values.type === t} onClick={() => set("type", t)}>
              {TYPE_LABELS[t]}
            </Chip>
          ))}
        </div>
      </Field>
      <TextField
        label="Nome do anúncio"
        placeholder="Ex.: Apartamento com varanda perto do parque"
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
        maxLength={120}
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <TextField label="Rua" value={values.street} onChange={(e) => set("street", e.target.value)} error={errors.street} autoComplete="address-line1" />
        <TextField label="Número" value={values.street_number} onChange={(e) => set("street_number", e.target.value)} error={errors.street_number} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Complemento" value={values.complement} onChange={(e) => set("complement", e.target.value)} error={errors.complement} />
        <TextField label="Bairro" value={values.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} error={errors.neighborhood} />
        <TextField label="CEP" inputMode="numeric" value={values.postal_code} onChange={(e) => set("postal_code", e.target.value)} error={errors.postal_code} />
      </div>
      <Field label="Confirme o pino no mapa" error={errors.pin_confirmed}>
        <PinMap
          address={address}
          value={values.lat !== null && values.lng !== null ? { lat: values.lat, lng: values.lng } : null}
          confirmed={values.pin_confirmed}
          onChange={(pin, confirmed) => {
            set("lat", pin?.lat ?? null);
            set("lng", pin?.lng ?? null);
            set("pin_confirmed", confirmed);
          }}
        />
      </Field>
    </>
  );
}

function StepValues({ values, set, errors }: StepProps) {
  const money = (key: "price" | "condo_fee" | "iptu_monthly", label: string, hint?: string) => (
    <TextField label={label} inputMode="decimal" placeholder="0" value={values[key]} onChange={(e) => set(key, e.target.value)} error={errors[key]} hint={hint} />
  );
  const count = (key: "bedrooms" | "suites" | "bathrooms" | "parking_spots", label: string) => (
    <TextField label={label} inputMode="numeric" value={values[key]} onChange={(e) => set(key, e.target.value.replace(/\D/g, ""))} error={errors[key]} />
  );
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {money("price", values.purpose === "aluguel" ? "Aluguel (R$ por mês)" : "Valor de venda (R$)")}
        <TextField label="Área útil (m²)" inputMode="decimal" value={values.area_m2} onChange={(e) => set("area_m2", e.target.value)} error={errors.area_m2} />
        {money("condo_fee", "Condomínio (R$ por mês)", "Use 0 se não houver.")}
        {money("iptu_monthly", "IPTU (R$ por mês)", "Valor anual dividido por 12. Use 0 se for isento.")}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {count("bedrooms", "Quartos")}
        {count("suites", "Suítes")}
        {count("bathrooms", "Banheiros")}
        {count("parking_spots", "Vagas")}
      </div>
    </>
  );
}

function StepFeatures({ values, set, errors }: StepProps) {
  return (
    <>
      <Field label="Aceita pets?" error={errors.pets}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PETS_LABELS) as PetsPolicy[]).map((p) => (
            <Chip key={p} selected={values.pets === p} onClick={() => set("pets", values.pets === p ? "" : p)}>
              {{ nao: "Não", pequeno: "Só pequeno porte", qualquer: "Qualquer porte" }[p]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Mobiliado?" error={errors.furnished}>
        <div className="flex gap-2">
          {(["sim", "nao"] as const).map((f) => (
            <Chip key={f} selected={values.furnished === f} onClick={() => set("furnished", values.furnished === f ? "" : f)}>
              {f === "sim" ? "Sim" : "Não"}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Andar" inputMode="numeric" value={values.floor} onChange={(e) => set("floor", e.target.value.replace(/[^\d-]/g, ""))} error={errors.floor} />
        <TextField label="Vista" placeholder="Ex.: Mar, parque, cidade" value={values.view} onChange={(e) => set("view", e.target.value)} error={errors.view} />
      </div>
      <Field label="Itens do prédio" error={errors.amenities}>
        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex min-h-touch items-center gap-2.5 text-[13px] font-medium">
              <input
                type="checkbox"
                checked={values.amenities.includes(a)}
                onChange={(e) =>
                  set("amenities", e.target.checked ? [...values.amenities, a] : values.amenities.filter((x) => x !== a))
                }
                className="size-[18px] accent-black"
              />
              {a}
            </label>
          ))}
        </div>
      </Field>
    </>
  );
}

function StepPhotos({
  propertyId,
  agencyId,
  photos,
  setPhotos,
  values,
  set,
  errors,
  onError,
}: StepProps & {
  propertyId: string;
  agencyId: string;
  photos: Photo[];
  setPhotos: (p: Photo[]) => void;
  onError: (msg?: string) => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string>();
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!list.length) {
      onError("Envie fotos em JPG, PNG ou WebP.");
      return;
    }
    const tooBig = list.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      onError(`A foto ${tooBig.name} passa de 10 MB.`);
      return;
    }
    onError(undefined);
    const supabase = createClient();
    const paths: string[] = [];
    for (const [i, file] of list.entries()) {
      setUploading(`Enviando ${i + 1} de ${list.length}…`);
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${agencyId}/${propertyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("imoveis").upload(path, file, { contentType: file.type });
      if (error) {
        onError("Não conseguimos enviar uma das fotos. Tente de novo.");
        break;
      }
      paths.push(path);
    }
    if (paths.length) {
      const r = await addPhotos(propertyId, paths);
      if (!r.ok) onError(r.error);
    }
    setUploading(undefined);
    router.refresh();
    // Atualiza a lista local com as URLs públicas (a página recarrega os dados em seguida).
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    setPhotos([
      ...photos,
      ...paths.map((p, i) => ({
        id: `novo-${p}`,
        url: `${base}/storage/v1/object/public/imoveis/${p}`,
        isCover: photos.length === 0 && i === 0,
      })),
    ]);
  }

  async function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const withCover = next.map((p, i) => ({ ...p, isCover: i === 0 }));
    setPhotos(withCover);
    if (withCover.some((p) => p.id.startsWith("novo-"))) {
      router.refresh();
      return;
    }
    const r = await reorderPhotos(propertyId, withCover.map((p) => p.id));
    if (!r.ok) onError(r.error);
  }

  async function remove(photo: Photo) {
    setPhotos(photos.filter((p) => p.id !== photo.id).map((p, i) => ({ ...p, isCover: i === 0 })));
    if (!photo.id.startsWith("novo-")) await removePhoto(propertyId, photo.id);
    router.refresh();
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn(
          "grid justify-items-center gap-2.5 rounded-card border-[1.5px] border-dashed p-6 text-center text-[13px] text-muted",
          dragging ? "border-black bg-paper" : "border-line-2",
        )}
      >
        <Icon name="upload" className="size-6" />
        <b className="text-ink">{uploading ?? "Arraste as fotos para cá"}</b>
        <span>ou escolha os arquivos. JPG, PNG ou WebP, até 10 MB cada.</span>
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={Boolean(uploading)}>
          Escolher fotos
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
      </div>
      {photos.length ? (
        <ul className="flex flex-wrap gap-3" aria-label="Fotos do imóvel">
          {photos.map((p, i) => (
            <li key={p.id} className="grid w-[184px] gap-1.5">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Foto ${i + 1}`} className="h-[130px] w-full rounded-xl object-cover" />
                {i === 0 ? <Tag tone="dark" className="absolute left-2 top-2">Capa</Tag> : null}
              </div>
              <div className="flex justify-between">
                <IconButton label="Mover para a esquerda" disabled={i === 0} onClick={() => void move(i, i - 1)} className="size-9">
                  <Icon name="back" size="sm" />
                </IconButton>
                <IconButton label="Usar como capa" disabled={i === 0} onClick={() => void move(i, 0)} className="size-9">
                  <Icon name="home" size="sm" />
                </IconButton>
                <IconButton label="Remover foto" onClick={() => void remove(p)} className="size-9">
                  <Icon name="trash" size="sm" />
                </IconButton>
                <IconButton label="Mover para a direita" disabled={i === photos.length - 1} onClick={() => void move(i, i + 1)} className="size-9">
                  <Icon name="arrow" size="sm" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted">A primeira foto é a capa. Use as setas para mudar a ordem.</p>
      <TextField
        label="Link do tour virtual (opcional)"
        placeholder="https://"
        value={values.tour_url}
        onChange={(e) => set("tour_url", e.target.value)}
        error={errors.tour_url}
      />
    </>
  );
}

function StepDescription({
  values,
  set,
  errors,
  brokers,
  minChars,
}: StepProps & { brokers: Broker[]; minChars: number }) {
  const length = values.description.trim().length;
  return (
    <>
      <div className="grid gap-1.5 text-[12.5px] font-semibold">
        <label htmlFor="descricao">Descrição</label>
        <textarea
          id="descricao"
          rows={8}
          maxLength={5000}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          aria-describedby="descricao-conta"
          className="rounded-field border-[1.5px] border-line-2 p-3.5 text-[15px] font-medium focus:border-black focus:outline-none"
        />
        <p id="descricao-conta" className={cn("font-medium", length >= minChars ? "text-ok" : "text-muted")}>
          {length} caracteres{length < minChars ? ` · faltam ${minChars - length} para o selo` : ""}
        </p>
        {errors.description ? <p className="font-semibold text-bad">{errors.description}</p> : null}
      </div>
      <div className="grid gap-1.5 text-[12.5px] font-semibold">
        <label htmlFor="corretor">Corretor responsável</label>
        <select
          id="corretor"
          value={values.broker_id}
          onChange={(e) => set("broker_id", e.target.value)}
          className="min-h-touch rounded-field border-[1.5px] border-line-2 bg-white px-3.5 text-[15px] font-medium focus:border-black focus:outline-none"
        >
          <option value="">Sem corretor definido</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.creci ? ` · CRECI ${b.creci}` : ""}
            </option>
          ))}
        </select>
        {errors.broker_id ? <p className="font-semibold text-bad">{errors.broker_id}</p> : null}
      </div>
    </>
  );
}

function StatusActions({
  status,
  pending,
  onChange,
  propertyId,
}: {
  status: PropertyStatus;
  pending: boolean;
  onChange: (s: PropertyStatus, msg: string) => void;
  propertyId: string;
}) {
  const [confirm, setConfirm] = useState<"vendido" | "alugado" | null>(null);
  return (
    <Card className="grid gap-3">
      <SectionTitle>Situação do anúncio</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {status === "pausado" ? (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => onChange("publicado", "Imóvel publicado de novo")}>
            Publicar de novo
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => setConfirm("vendido")}>
          Marcar como vendido
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => setConfirm("alugado")}>
          Marcar como alugado
        </Button>
        {status === "publicado" ? (
          <Link href={`/app/imoveis/${propertyId}`} target="_blank" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Ver como o cliente vê
          </Link>
        ) : null}
      </div>
      {confirm ? (
        <div role="alertdialog" aria-label="Confirmar" className="grid gap-3 rounded-[14px] bg-paper p-4 text-[13px]">
          <p>
            Marcar como <b>{confirm}</b>? O imóvel sai das recomendações e quem salvou vai ver que ele não está mais
            disponível.
          </p>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="border-bad text-bad"
              onClick={() => {
                onChange(confirm, confirm === "vendido" ? "Marcado como vendido" : "Marcado como alugado");
                setConfirm(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
