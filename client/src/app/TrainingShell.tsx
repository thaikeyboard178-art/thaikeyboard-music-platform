import React, { useId, useRef, useState } from "react";
import { Link } from "wouter";
import { Home, Menu, X } from "lucide-react";
import { getTrainingModules } from "./moduleRegistry";

export function TrainingHeader({ currentModuleId }: { currentModuleId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const navigationId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  return (
    <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape" && expanded) { event.preventDefault(); setExpanded(false); toggleRef.current?.focus(); } }}>
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label="THAIKEYBOARD Music Training, trang chủ"><span className="brand-key" aria-hidden="true"><i /><i /><i /></span><span>THAIKEYBOARD<small>MUSIC TRAINING</small></span></Link>
        <button ref={toggleRef} type="button" className="module-menu-toggle" aria-label={expanded ? "Đóng menu bài học" : "Mở menu bài học"} aria-expanded={expanded} aria-controls={navigationId} onClick={() => setExpanded(!expanded)}>{expanded ? <X size={19} /> : <Menu size={19} />}</button>
        <nav id={navigationId} className={`platform-navigation ${expanded ? "is-expanded" : ""}`} aria-label="Điều hướng">
          <Link href="/" className={currentModuleId ? "nav-link" : "nav-current"} aria-current={currentModuleId ? undefined : "page"} onClick={() => setExpanded(false)}><Home size={15} /> Trang chủ</Link>
          {getTrainingModules().map((module) => module.status === "active" ? (
            <Link key={module.id} href={module.path} className={currentModuleId === module.id ? "nav-current" : "nav-link"} aria-current={currentModuleId === module.id ? "page" : undefined} onClick={() => setExpanded(false)}>{module.navLabel}</Link>
          ) : (
            <span key={module.id} className="nav-coming-soon" aria-disabled="true" title={`${module.englishName} — Coming Soon`}>{module.navLabel}<small>Coming Soon</small></span>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function TrainingFooter() {
  return <footer className="module-footer"><span>THAIKEYBOARD <i>·</i> MUSIC TRAINING</span><span>Luyện nhạc mỗi ngày, tiến bộ từng bước.</span></footer>;
}
