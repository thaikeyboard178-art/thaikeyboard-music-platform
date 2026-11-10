import React from "react";
import { ArrowRight, BookOpen, CheckCircle2, Music2, Sparkles } from "lucide-react";
import { Link } from "wouter";

type PracticeProgress = {
  sessionsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
};

const PROGRESS_KEY = "thaikeyboard-music-training-progress-v1";

function readProgress(): PracticeProgress {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      const value = JSON.parse(saved) as Partial<PracticeProgress>;
      return {
        sessionsCompleted: Number(value.sessionsCompleted) || 0,
        questionsAnswered: Number(value.questionsAnswered) || 0,
        correctAnswers: Number(value.correctAnswers) || 0,
      };
    }
  } catch {
    // Local progress is optional and can be disabled by the browser.
  }
  return { sessionsCompleted: 0, questionsAnswered: 0, correctAnswers: 0 };
}

export default function Home() {
  const progress = readProgress();
  const accuracy = progress.questionsAnswered ? Math.round(progress.correctAnswers / progress.questionsAnswered * 100) : 0;

  return (
    <div className="training-app landing-app">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label="THAIKEYBOARD Music Training, trang chủ"><span className="brand-key" aria-hidden="true"><i /><i /><i /></span><span>THAIKEYBOARD<small>MUSIC TRAINING</small></span></Link>
          <nav aria-label="Điều hướng"><a className="nav-current" href="#modules">Các bài học</a><a className="nav-link" href="#about">Giới thiệu</a></nav>
        </div>
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="module-kicker"><span className="eyebrow-dot" /> MUSIC TRAINING · HỌC NHẠC THEO NHỊP CỦA BẠN</span>
            <h1>Nhìn nốt.<br />Gọi tên.<br /><em>Chơi đúng.</em></h1>
            <p>Rèn khả năng đọc nhạc bằng bài tập rõ ràng, chuẩn xác và hoàn toàn miễn phí. Bắt đầu ngay, không cần tài khoản.</p>
            <Link href="/note-reading" className="hero-cta">Bắt đầu luyện đọc nốt <ArrowRight size={18} /></Link>
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
          <div className="section-heading"><div><span className="module-kicker">BẮT ĐẦU HỌC</span><h2 id="modules-title">Chọn một bài học</h2></div><span className="section-aside">Module 01 · Sẵn sàng luyện tập</span></div>
          <article className="module-card">
            <div className="module-card-icon"><Music2 size={28} /></div>
            <div className="module-card-main"><span className="module-number">MODULE 01</span><h3>Đọc nốt nhạc</h3><p>Luyện nhận diện nốt trên khuông với khóa Sol, khóa Fa và khuông mở rộng.</p><div className="module-tags"><span>Khóa Sol &amp; Fa</span><span>Piano ảo</span><span>Thử thách hằng ngày</span></div></div>
            <div className="module-card-aside">{progress.questionsAnswered > 0 ? <div className="progress-summary"><span>TIẾN TRÌNH CỦA BẠN</span><strong>{progress.questionsAnswered} <small>câu đã luyện</small></strong><small>{accuracy}% câu trả lời đúng</small></div> : <div className="progress-summary new-learner"><span><Sparkles size={14} /> SẴN SÀNG BẮT ĐẦU</span><strong>Học từng nốt</strong><small>Tiến bộ theo nhịp của bạn</small></div>}<Link href="/note-reading" className="module-open-button">{progress.questionsAnswered > 0 ? "Tiếp tục luyện" : "Mở bài học"}<ArrowRight size={17} /></Link></div>
          </article>
        </section>

        <section className="landing-bottom" id="about"><div className="landing-note"><BookOpen size={21} /><p><strong>Học nhạc theo cách thực tế.</strong><br />Nhận phản hồi ngay sau mỗi câu và luyện lại bao nhiêu lần bạn muốn.</p></div><span className="free-statement">HAI NĂM ĐẦU MIỄN PHÍ · KHÔNG QUẢNG CÁO · KHÔNG TÀI KHOẢN</span></section>
        <footer className="module-footer"><span>THAIKEYBOARD <i>·</i> MUSIC TRAINING</span><span>Học nhạc từng nốt, tiến bộ từng ngày.</span></footer>
      </main>
    </div>
  );
}
