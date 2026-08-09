import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  Camera,
  Aperture,
  Pencil,
  TrendingUp,
  Target,
  BarChart3,
  Check,
  BadgeCheck,
} from "lucide-react";

const styles = `
.sm-page {
  --sm-bg:#FBFAF7; --sm-surface:#FFFFFF; --sm-surface-2:#F4F1EB;
  --sm-ink:#14201B; --sm-ink-soft:#55645C; --sm-line:#E8E4DB;
  --sm-green:#12B76A; --sm-green-deep:#0E9155; --sm-tangerine:#FF7A45;
  --sm-shadow:0 18px 50px -20px rgba(20,32,27,.28);
  --sm-shadow-sm:0 4px 16px -8px rgba(20,32,27,.25);
  --sm-radius:20px; --sm-maxw:1120px;
  background:var(--sm-bg); color:var(--sm-ink); overflow-x:hidden;
}
@media (prefers-color-scheme:dark){
  .sm-page{
    --sm-bg:#0B120F; --sm-surface:#121B17; --sm-surface-2:#16211C;
    --sm-ink:#EAF2EE; --sm-ink-soft:#9DB3A9; --sm-line:#21302A;
    --sm-green:#2DD48A; --sm-green-deep:#1FB673; --sm-tangerine:#FF8A5C;
    --sm-shadow:0 24px 60px -24px rgba(0,0,0,.7);
    --sm-shadow-sm:0 6px 20px -10px rgba(0,0,0,.6);
  }
}
.sm-page *{box-sizing:border-box;}
.sm-wrap{max-width:var(--sm-maxw);margin:0 auto;padding:0 24px;}
.sm-page a{color:inherit;text-decoration:none;}
.sm-eyebrow{font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--sm-green-deep);}
.sm-nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0;}
.sm-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.28rem;letter-spacing:-.02em;}
.sm-mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(140deg,var(--sm-green),var(--sm-green-deep));box-shadow:var(--sm-shadow-sm);flex:none;color:#fff;}
.sm-brand b{color:var(--sm-green-deep);}
.sm-nav-right{display:flex;align-items:center;gap:22px;font-weight:600;font-size:.95rem;}
.sm-nav-right .sm-muted{color:var(--sm-ink-soft);}
.sm-btn{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:1rem;padding:14px 22px;border-radius:13px;cursor:pointer;border:0;transition:transform .15s ease,box-shadow .2s ease;}
.sm-btn-primary{background:var(--sm-green);color:#05130C;box-shadow:0 10px 24px -10px var(--sm-green);}
.sm-btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 30px -12px var(--sm-green);}
.sm-link-quiet{color:var(--sm-ink-soft);font-weight:600;}
.sm-link-quiet:hover{color:var(--sm-ink);}
.sm-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:40px 0 72px;}
.sm-hero h1{font-size:clamp(2.5rem,5.2vw,3.75rem);line-height:1.03;letter-spacing:-.035em;font-weight:850;margin:20px 0 0;text-wrap:balance;}
.sm-hero h1 .sm-accent{color:var(--sm-green-deep);}
.sm-hero .sm-sub{font-size:1.17rem;color:var(--sm-ink-soft);margin:20px 0 0;max-width:30ch;}
.sm-cta-row{display:flex;align-items:center;gap:20px;margin-top:32px;flex-wrap:wrap;}
.sm-trust-line{display:flex;align-items:center;gap:8px;margin-top:20px;font-size:.9rem;color:var(--sm-ink-soft);}
.sm-trust-line svg{color:var(--sm-green-deep);flex:none;}
.sm-stage{position:relative;display:grid;place-items:center;}
.sm-phone{position:relative;width:300px;height:500px;border-radius:40px;background:var(--sm-surface);border:1px solid var(--sm-line);box-shadow:var(--sm-shadow);padding:12px;z-index:2;}
.sm-notch{position:absolute;top:20px;left:50%;transform:translateX(-50%);width:96px;height:7px;border-radius:99px;background:var(--sm-line);}
.sm-photo{height:100%;border-radius:30px;overflow:hidden;position:relative;background:radial-gradient(120px 90px at 34% 40%,#F6B24B,transparent 70%),radial-gradient(130px 110px at 66% 58%,#E4572E,transparent 72%),radial-gradient(150px 120px at 52% 78%,#3E8E5A,transparent 75%),linear-gradient(160deg,#7a5a3a,#43301f);}
.sm-photo::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,transparent 45%,rgba(0,0,0,.28));}
.sm-flash{position:absolute;inset:0;background:#fff;opacity:0;border-radius:30px;z-index:5;pointer-events:none;animation:smFlash 4.5s ease 1.1s 1 both;}
.sm-nutri{position:absolute;left:14px;right:14px;bottom:14px;z-index:6;background:var(--sm-surface);border:1px solid var(--sm-line);border-radius:18px;padding:15px 16px;box-shadow:var(--sm-shadow);transform:translateY(18px);opacity:0;animation:smRise .7s cubic-bezier(.2,.7,.2,1) 1.5s both;}
.sm-nutri .sm-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.sm-dish{font-weight:750;font-size:.98rem;letter-spacing:-.01em;}
.sm-kcal{font-family:var(--font-geist-sans),ui-monospace,monospace;font-weight:700;color:var(--sm-green-deep);font-size:.92rem;white-space:nowrap;font-variant-numeric:tabular-nums;}
.sm-macros{display:flex;gap:7px;margin-top:12px;}
.sm-macro{flex:1;background:var(--sm-surface-2);border-radius:11px;padding:8px 6px;text-align:center;}
.sm-macro .sm-v{font-weight:700;font-size:1rem;font-variant-numeric:tabular-nums;}
.sm-macro .sm-l{font-size:.62rem;letter-spacing:.1em;text-transform:uppercase;color:var(--sm-ink-soft);margin-top:2px;}
.sm-macro.p .sm-v{color:var(--sm-green-deep);}
.sm-macro.c .sm-v{color:#3B82C4;}
.sm-macro.f .sm-v{color:var(--sm-tangerine);}
.sm-shutter{position:absolute;z-index:3;top:40px;right:-18px;background:var(--sm-tangerine);color:#fff;font-weight:700;font-size:.8rem;padding:9px 14px;border-radius:13px;box-shadow:var(--sm-shadow-sm);display:flex;align-items:center;gap:7px;transform:rotate(4deg);}
@keyframes smFlash{0%,100%{opacity:0;}8%{opacity:.85;}22%{opacity:0;}}
@keyframes smRise{to{transform:translateY(0);opacity:1;}}
.sm-section{padding:64px 0;}
.sm-sec-head{max-width:40ch;}
.sm-sec-head h2{font-size:clamp(1.7rem,3.2vw,2.3rem);letter-spacing:-.03em;font-weight:820;margin:12px 0 0;text-wrap:balance;}
.sm-sec-head p{color:var(--sm-ink-soft);margin:12px 0 0;font-size:1.05rem;}
.sm-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px;}
.sm-step{background:var(--sm-surface);border:1px solid var(--sm-line);border-radius:var(--sm-radius);padding:26px 24px;box-shadow:var(--sm-shadow-sm);}
.sm-step .sm-n{font-weight:700;color:var(--sm-green-deep);font-size:.82rem;font-variant-numeric:tabular-nums;}
.sm-step-ico{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:color-mix(in oklab,var(--sm-green) 15%,transparent);color:var(--sm-green-deep);margin:14px 0 16px;}
.sm-step h3{margin:0;font-size:1.15rem;letter-spacing:-.01em;}
.sm-step p{margin:8px 0 0;color:var(--sm-ink-soft);font-size:.96rem;}
.sm-eli5{background:var(--sm-surface-2);border-radius:28px;padding:48px;margin:0 24px;}
.sm-eli5-inner{max-width:var(--sm-maxw);margin:0 auto;}
.sm-eli5 h2{font-size:clamp(1.7rem,3.2vw,2.3rem);letter-spacing:-.03em;font-weight:820;margin:12px 0 0;}
.sm-eli5 .sm-lead{color:var(--sm-ink-soft);margin:12px 0 0;font-size:1.08rem;max-width:52ch;}
.sm-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:36px;align-items:stretch;}
.sm-node{background:var(--sm-surface);border:1px solid var(--sm-line);border-radius:16px;padding:20px 18px;position:relative;}
.sm-node .sm-tag{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--sm-green-deep);font-weight:700;}
.sm-node .sm-big{font-weight:800;font-size:1.05rem;margin:8px 0 0;letter-spacing:-.01em;}
.sm-node p{margin:8px 0 0;color:var(--sm-ink-soft);font-size:.9rem;line-height:1.45;}
.sm-node::after{content:"→";position:absolute;right:-12px;top:50%;transform:translateY(-50%);color:var(--sm-green-deep);font-weight:800;z-index:2;font-size:1.1rem;}
.sm-node:last-child::after{content:none;}
.sm-eli5-foot{display:flex;align-items:center;gap:11px;margin-top:30px;font-weight:650;font-size:1.02rem;}
.sm-eli5-foot svg{color:var(--sm-green-deep);flex:none;}
.sm-eli5-foot .sm-fine{color:var(--sm-ink-soft);font-weight:500;font-size:.92rem;}
.sm-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:40px;}
.sm-fcard{display:flex;gap:14px;align-items:flex-start;}
.sm-fcard .sm-fi{width:38px;height:38px;border-radius:11px;flex:none;display:grid;place-items:center;background:var(--sm-surface);border:1px solid var(--sm-line);color:var(--sm-green-deep);}
.sm-fcard h4{margin:2px 0 0;font-size:1.02rem;letter-spacing:-.01em;}
.sm-fcard p{margin:6px 0 0;color:var(--sm-ink-soft);font-size:.92rem;}
.sm-close{text-align:center;background:linear-gradient(150deg,var(--sm-green-deep),#0a6f42);border-radius:28px;padding:56px 32px;margin:0 24px;color:#EAFBF2;}
.sm-close h2{font-size:clamp(1.8rem,3.6vw,2.5rem);letter-spacing:-.03em;font-weight:830;margin:0;color:#fff;text-wrap:balance;}
.sm-close p{margin:14px auto 0;max-width:40ch;color:#C7ECD8;font-size:1.08rem;}
.sm-close .sm-btn-primary{background:#fff;color:#0a6f42;margin-top:28px;}
.sm-footer{padding:44px 0 56px;border-top:1px solid var(--sm-line);margin-top:40px;color:var(--sm-ink-soft);font-size:.92rem;}
.sm-foot-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
@media (max-width:900px){
  .sm-hero{grid-template-columns:1fr;gap:40px;}
  .sm-stage{order:-1;}
  .sm-steps,.sm-flow,.sm-feat{grid-template-columns:1fr;}
  .sm-node::after{content:"↓";right:50%;top:auto;bottom:-14px;transform:translateX(50%);}
  .sm-eli5,.sm-close{padding:36px 22px;margin:0 16px;}
}
@media (prefers-reduced-motion:reduce){
  .sm-flash,.sm-nutri{animation:none;}
  .sm-nutri{transform:none;opacity:1;}
  .sm-btn{transition:none;}
}
`;

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="sm-page">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="sm-wrap">
        <nav className="sm-nav">
          <div className="sm-brand">
            <span className="sm-mark">
              <Camera className="w-[19px] h-[19px]" />
            </span>
            Snap<b>Meal</b>
          </div>
          <div className="sm-nav-right">
            <a href="#how" className="sm-muted">
              How it works
            </a>
            <a href="#math" className="sm-muted">
              The math
            </a>
            <Link href="/auth/signin" className="sm-link-quiet">
              Sign in
            </Link>
          </div>
        </nav>

        <header className="sm-hero">
          <div>
            <span className="sm-eyebrow">snapmeal.dev</span>
            <h1>
              Snap your meal.
              <br />
              Know your <span className="sm-accent">macros</span>.
              <br />
              Hit your goals.
            </h1>
            <p className="sm-sub">
              Point your camera at a plate. Get calories and protein, carbs and
              fat in seconds — no weighing, no lookup tables, no guessing.
            </p>
            <div className="sm-cta-row">
              <Link href="/auth/signin" className="sm-btn sm-btn-primary">
                <Camera className="w-[18px] h-[18px]" />
                Snap your first meal — free
              </Link>
              <Link href="/auth/signin" className="sm-link-quiet">
                or sign in →
              </Link>
            </div>
            <div className="sm-trust-line">
              <Check className="w-4 h-4" />
              Your targets are calculated, not guessed — the same formulas the
              big fitness apps use.
            </div>
          </div>

          <div className="sm-stage">
            <div className="sm-shutter">
              <Aperture className="w-[15px] h-[15px]" />
              snap!
            </div>
            <div className="sm-phone">
              <div className="sm-notch" />
              <div className="sm-photo">
                <div className="sm-flash" />
                <div className="sm-nutri">
                  <div className="sm-top">
                    <span className="sm-dish">Grilled chicken bowl</span>
                    <span className="sm-kcal">540 kcal</span>
                  </div>
                  <div className="sm-macros">
                    <div className="sm-macro p">
                      <div className="sm-v">42g</div>
                      <div className="sm-l">Protein</div>
                    </div>
                    <div className="sm-macro c">
                      <div className="sm-v">38g</div>
                      <div className="sm-l">Carbs</div>
                    </div>
                    <div className="sm-macro f">
                      <div className="sm-v">18g</div>
                      <div className="sm-l">Fat</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* How it works */}
      <section id="how" className="sm-section">
        <div className="sm-wrap">
          <div className="sm-sec-head">
            <span className="sm-eyebrow">How it works</span>
            <h2>Three taps from photo to progress.</h2>
            <p>
              No barcode scanning, no searching a database of 40,000 foods. Just
              snap and go.
            </p>
          </div>
          <div className="sm-steps">
            <div className="sm-step">
              <span className="sm-n">01</span>
              <div className="sm-step-ico">
                <Camera className="w-[22px] h-[22px]" />
              </div>
              <h3>Snap a photo</h3>
              <p>
                The AI reads what&apos;s on the plate and estimates the calories
                and macros for you.
              </p>
            </div>
            <div className="sm-step">
              <span className="sm-n">02</span>
              <div className="sm-step-ico">
                <Pencil className="w-[22px] h-[22px]" />
              </div>
              <h3>Review &amp; tweak</h3>
              <p>
                Not quite right? Fix an amount or tell it &ldquo;that&apos;s
                juice, not a mimosa&rdquo; — the numbers follow.
              </p>
            </div>
            <div className="sm-step">
              <span className="sm-n">03</span>
              <div className="sm-step-ico">
                <TrendingUp className="w-[22px] h-[22px]" />
              </div>
              <h3>Track your goal</h3>
              <p>
                Every meal counts toward daily targets we set from your body and
                your goal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explain it like I'm 5 */}
      <section id="math" className="sm-section" style={{ paddingBottom: 0 }}>
        <div className="sm-eli5">
          <div className="sm-eli5-inner">
            <span className="sm-eyebrow">Explain it like I&apos;m 5</span>
            <h2>Where your daily targets come from.</h2>
            <p className="sm-lead">
              No black box. Here&apos;s the whole chain in plain language — so
              you can trust that if you hit these numbers, the goal actually
              happens.
            </p>
            <div className="sm-flow">
              <div className="sm-node">
                <div className="sm-tag">at rest</div>
                <div className="sm-big">Your body burns fuel just existing</div>
                <p>
                  Breathing, thinking, keeping warm. Bigger, younger, taller
                  bodies burn more. We work this out from your stats.
                </p>
              </div>
              <div className="sm-node">
                <div className="sm-tag">+ moving</div>
                <div className="sm-big">You burn more when you move</div>
                <p>
                  Add your activity level and we get your real daily burn — the
                  calories you&apos;d need to stay exactly the same.
                </p>
              </div>
              <div className="sm-node">
                <div className="sm-tag">your target</div>
                <div className="sm-big">We aim a little under to lose</div>
                <p>
                  To lose weight safely we set your target a bit below your burn
                  — about half a kilo a week, no crash dieting.
                </p>
              </div>
              <div className="sm-node">
                <div className="sm-tag">the catch</div>
                <div className="sm-big">Protein stays high</div>
                <p>
                  Eating less can cost muscle. We keep protein up so the weight
                  you lose is fat, not the good stuff.
                </p>
              </div>
            </div>
            <div className="sm-eli5-foot">
              <BadgeCheck className="w-5 h-5" />
              <div>
                Hit the target, reach the goal.
                <span className="sm-fine">
                  {" "}
                  &nbsp;Built on the Mifflin-St Jeor equation — the standard
                  dietitians and top fitness apps use. Recalculates as your
                  weight changes.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="sm-section">
        <div className="sm-wrap">
          <div className="sm-sec-head">
            <span className="sm-eyebrow">Everything else</span>
            <h2>Quietly doing the tedious parts.</h2>
          </div>
          <div className="sm-feat">
            <div className="sm-fcard">
              <div className="sm-fi">
                <Pencil className="w-[19px] h-[19px]" />
              </div>
              <div>
                <h4>Fix what the AI misses</h4>
                <p>
                  Correct a food or an amount in one tap; macros recompute
                  instantly.
                </p>
              </div>
            </div>
            <div className="sm-fcard">
              <div className="sm-fi">
                <Target className="w-[19px] h-[19px]" />
              </div>
              <div>
                <h4>Goals that set themselves</h4>
                <p>
                  Enter your stats once; your calorie, protein and exercise
                  targets appear.
                </p>
              </div>
            </div>
            <div className="sm-fcard">
              <div className="sm-fi">
                <BarChart3 className="w-[19px] h-[19px]" />
              </div>
              <div>
                <h4>A dashboard that adds up</h4>
                <p>
                  Intake vs. target, macros, exercise and your weight plan in one
                  view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="sm-section" style={{ paddingTop: 24 }}>
        <div className="sm-close">
          <h2>Your next meal is a data point.</h2>
          <p>
            Start free. Snap a plate and watch it turn into your day&apos;s
            numbers.
          </p>
          <Link href="/auth/signin" className="sm-btn sm-btn-primary">
            Snap your first meal — free
          </Link>
        </div>
      </section>

      <div className="sm-wrap">
        <footer className="sm-footer">
          <div className="sm-foot-row">
            <div className="sm-brand" style={{ fontSize: "1.1rem" }}>
              <span
                className="sm-mark"
                style={{ width: 28, height: 28, borderRadius: 9 }}
              >
                <Camera className="w-[15px] h-[15px]" />
              </span>
              Snap<b>Meal</b>
            </div>
            <div>snapmeal.dev &nbsp;·&nbsp; Snap it. Track it. Reach it.</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
