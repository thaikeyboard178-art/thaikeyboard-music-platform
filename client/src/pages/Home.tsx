import React from "react";
import { ArrowRight, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { getActiveTrainingModules, getTrainingModules } from "@/app/moduleRegistry";
import { TrainingHeader, TrainingFooter } from "@/app/TrainingShell";
import { readPracticeProgress } from "@/features/training/progress";

export default function Home() {
  const progress = readPracticeProgress();
  const accuracy = progress.questionsAnswered ? Math.round(progress.correctAnswers / progress.questionsAnswered * 100) : 0;
  const modules = getTrainingModules();
  const activeModules = getActiveTrainingModules();
  const featuredModule = activeModules[0];

  return (
    <div className="training-app landing-app">
      <TrainingHeader />
      <main className="landing-main">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="module-kicker"><span className="eyebrow-dot" /> MUSIC TRAINING · HỌC NHẠC THEO NHỊP CỦA BẠN</span>
            <h1>Nhìn nốt.<br />Gọi tên.<br /><em>Chơi đúng.</em></h1>
            <p>Rèn khả năng đọc nhạc bằng bài tập rõ ràng, chuẩn xác và hoàn toàn miễn phí. Bắt đầu ngay, không cần tài khoản.</p>
            {featuredModule && <Link href={featuredModule.path} className="hero-cta">Bắt đầu luyện <ArrowRight size={18} /></Link>}
            <div className="hero-trust"><span><CheckCircle2 size={15} /> Không giới hạn</span><span><CheckCircle2 size={15} /> Không cần đăng ký</span><span><CheckCircle2 size={15} /> Miễn phí</span></div>
          </div>
          <div className="hero-notation" aria-hidden="true">
            <div className="notation-note-label">ÂM NHẠC BẮT ĐẦU TỪ MỘT NỐT</div>
            <svg viewBox="0 0 520 270" role="presentation">
              <g className="hero-staff-lines"><line x1="22" y1="75" x2="485" y2="75" /><line x1="22" y1="99" x2="485" y2="99" /><line x1="22" y1="123" x2="485" y2="123" /><line x1="22" y1="147" x2="485" y2="147" /><line x1="22" y1="171" x2="485" y2="171" /></g>
              <text x="36" y="164" className="hero-treble-clef">𝄞</text>
              <ellipse cx="297" cy="171" rx="17" ry="12" transform="rotate(-18 297 171)" className="hero-notehead" />
              <line x1="312" y1="171" x2="312" y2="95" className="hero-stem" />
              <path d="M312 95 C350 97 360 121 342 138" className="hero-flag" />
              <circle cx="406" cy="112" r="6" className="hero-note-spark" /><circle cx="431" cy="94" r="3" className="hero-note-spark light" /><circle cx="442" cy="131" r="4" className="hero-note-spark light" />
              <text x="369" y="213" className="hero-note-name">Mi₄</text>
              <path d="M347 212 C379 231 427 230 448 204" className="hero-swoosh" />
            </svg>
            <span className="hero-notation-caption">ĐỌC ĐÚNG TỪ NỀN TẢNG</span>
          </div>
        </section>

        <section className="module-section" id="modules" aria-labelledby="modules-title">
          <div className="section-heading"><div><span className="module-kicker">BẮT ĐẦU HỌC</span><h2 id="modules-title">Chọn một bài học</h2></div><span className="section-aside">{activeModules.length} bài sẵn sàng · {modules.length - activeModules.length} Coming Soon</span></div>
          {progress.questionsAnswered > 0 && (
            <div className="platform-progress" aria-label="Tiến trình luyện tập tổng hợp">
              <span>TIẾN TRÌNH LUYỆN TẬP CỦA BẠN</span><strong>{progress.questionsAnswered} <small>câu đã luyện</small></strong><small>{progress.sessionsCompleted} lượt hoàn thành · {accuracy}% câu trả lời đúng</small>
            </div>
          )}
          <div className="module-catalog">
            {modules.map((module, index) => (
              <article key={module.id} className={`module-card ${module.status === "coming-soon" ? "is-coming-soon" : ""}`} aria-labelledby={`module-${module.id}`}>
                <div className="module-card-icon"><module.Icon size={28} /></div>
                <div className="module-card-main"><span className="module-number">MODULE {String(index + 1).padStart(2, "0")} · {module.englishName}</span><h3 id={`module-${module.id}`}>{module.name}</h3><p>{module.description}</p><div className="module-tags">{module.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
                <div className="module-card-aside">
                  {module.status === "active" ? (
                    <><div className="progress-summary new-learner"><span><Sparkles size={14} /> SẴN SÀNG BẮT ĐẦU</span><strong>Luyện theo nhịp riêng</strong><small>Nhận phản hồi ngay sau mỗi câu</small></div><Link href={module.path} className="module-open-button">{progress.questionsAnswered > 0 && activeModules.length === 1 ? "Tiếp tục luyện" : "Mở bài học"}<ArrowRight size={17} /></Link></>
                  ) : (
                    <><span className="coming-soon-badge">Coming Soon</span><p className="coming-soon-note">Sắp ra mắt · Chưa có bài luyện</p></>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-bottom" id="about"><div className="landing-note"><BookOpen size={21} /><p><strong>Học nhạc theo cách thực tế.</strong><br />Nhận phản hồi ngay sau mỗi câu và luyện lại bao nhiêu lần bạn muốn.</p></div><span className="free-statement">HAI NĂM ĐẦU MIỄN PHÍ · KHÔNG QUẢNG CÁO · KHÔNG TÀI KHOẢN</span></section>
        <TrainingFooter />
      </main>
    </div>
  );
}
