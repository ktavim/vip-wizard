/**
 * Naming for the seed state of the "Assign Hosts" step, where every VIP starts out holding
 * exactly one host — so a VIP is better named after that host than after its position in the
 * list. Nothing re-derives the name after a drag: names are free-form and user-editable, and
 * this only decides what the user sees first.
 */

/**
 * Suffixes stripped off the tail of a hostname before casing, because a public TLD says
 * nothing about what the VIP serves. Not the real Public Suffix List — that is thousands of
 * entries behind a file you have to keep refreshing — but the ccTLDs plus the generic TLDs
 * that actually turn up on service hosts, which is the coverage this needs.
 *
 * Private-network suffixes (`internal`, `corp`, `local`, `lan`, `intranet`, `home`) are
 * deliberately absent: they are the most informative part of `vault.hashicorp.internal`,
 * saying at a glance that the VIP fronts something inside the perimeter.
 */
const PUBLIC_SUFFIXES = new Set(
  `com net org edu gov mil int info biz name pro app dev cloud page site online tech xyz
   store shop blog live media digital network systems solutions services group agency software
   ac ad ae af ag ai al am ao aq ar as at au aw ax az
   ba bb bd be bf bg bh bi bj bm bn bo br bs bt bw by bz
   ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz
   de dj dk dm do dz ec ee eg eh er es et eu fi fj fk fm fo fr
   ga gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu
   id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz
   la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw
   mx my mz na nc ne nf ng ni nl no np nr nu nz om
   pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw
   sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz
   tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk us uy uz
   va vc ve vg vi vn vu wf ws ye yt za zm zw`
    .trim()
    .split(/\s+/),
);

/**
 * Suffixes that are public only in second position, under a real TLD: the `co` of `co.uk`, the
 * `gov` of `gov.il`. Applied as a second pass, so they only ever come off a host that already
 * ended in a public TLD — `elastic.observability.corp` never reaches this step.
 */
const SECOND_LEVEL_SUFFIXES = new Set('co com net org edu gov ac mil or ne go gob nom'.split(' '));

/**
 * Pascal-cases a hostname into a VIP name, dropping a leading `www` label and any trailing
 * public suffix (the parts that carry no information here) and treating `.`, `-` and `_` alike
 * as word breaks: `www.tax-service.gov` → `TaxService`, `api.example.co.uk` → `ApiExample`,
 * `vault.hashicorp.internal` → `VaultHashicorpInternal`.
 *
 * Never strips the last label standing: a bare internal hostname has no domain to fall back on,
 * and a two-letter one collides with a ccTLD (`db`, `ci`), so those must survive intact. Still
 * returns `''` for input with nothing usable in it at all — `www`, or pure punctuation —
 * leaving the fallback to callers, which is where the app name lives.
 */
export function vipNameFromHost(host: string): string {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels[0] === 'www') labels.shift();
  if (labels.length > 1 && PUBLIC_SUFFIXES.has(labels[labels.length - 1])) {
    labels.pop();
    if (labels.length > 1 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 1])) labels.pop();
  }
  const words = labels.join('.').split(/[^a-z0-9]+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

/**
 * Names one VIP per host, in order. Two hosts can reduce to the same name (`stripe.com` and
 * `www.stripe.co.uk` both give `Stripe`), and duplicate VIP names would collide as F5 object
 * names at deploy time, so repeats get a numeric suffix: `Stripe`, `Stripe2`, `Stripe3`.
 *
 * `fallback` supplies a name for hosts that reduce to nothing — the caller's positional `Vip<n>`
 * form — and is passed the host's index.
 */
export function seedVipNames(
  hosts: readonly string[],
  fallback: (index: number) => string,
): string[] {
  const used = new Set<string>();
  return hosts.map((host, i) => {
    const base = vipNameFromHost(host) || fallback(i);
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}${n}`;
    used.add(name);
    return name;
  });
}
