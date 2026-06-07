export type Locale = "en" | "ko";
export const LOCALES: Locale[] = ["en", "ko"];
export const defaultLocale: Locale = "en";

// 모든 UI 문자열. en/ko 동일 구조 유지.
const en = {
  localeLabel: { en: "EN", ko: "한국어" },

  appTagline: "Guitar lick TAB notebook",
  password: "Password",
  login: "Enter",
  loggingIn: "Checking…",
  wrongPassword: "Incorrect password.",

  licksCount: (n: number) => `${n} lick${n === 1 ? "" : "s"} collected`,
  exportJson: "Export",
  importJson: "Import",
  newLick: "New lick",
  searchPlaceholder: "Search title, memo, tags…",
  searchAria: "Search licks",
  all: "All",
  tagFilterAria: "Tag filter",
  emptyTitleEmpty: "Nothing here yet",
  emptyTitleFiltered: "No results",
  emptyBodyEmpty: "Jot down the licks you like, one line at a time.",
  emptyBodyFiltered: "Try a different search term or tag.",
  writeFirst: "Write your first lick",
  noTags: "No tags",
  noteCount: (n: number) => `${n} note${n === 1 ? "" : "s"}`,

  back: "Back",
  newLickHeading: "New lick",
  editLickHeading: "Edit lick",

  titleLabel: "Title",
  titlePlaceholder: "e.g. BB box bend",
  tabLabel: "TAB",
  tuningLabel: "Tuning",
  tagsLabel: "Tags",
  tagsHint: "comma separated",
  tagsPlaceholder: "blues, bb-king",
  sourceLabel: "Source",
  sourceHint: "song / link",
  sourcePlaceholder: "youtube.com/…",
  memoLabel: "Memo",
  memoPlaceholder: "Where you picked it up, how it feels…",
  save: "Save",
  update: "Update",

  edit: "Edit",
  del: "Delete",
  confirmDelete: "Sure?",
  cancel: "Cancel",

  copy: "Copy",
  copied: "Copied ✓",
  copyAria: "Copy TAB as ASCII",

  articulations: "Articulations",
  articToggleHint: "Toggle with the buttons",
  selectNoteHint: "Select a note to apply",
  hammerOn: "Hammer-on",
  pullOff: "Pull-off",
  slideUp: "Slide up",
  slideDown: "Slide down",
  fullBend: "Full bend",
  halfBend: "Half bend",
  vibrato: "Vibrato",
  clearNote: "Clear note",
  fretInputAria: "Fret number input",
  addColumn: "Add column",
  deleteColumn: (c: number) => `Delete column ${c + 1}`,
  editorTip:
    "Tip: tap a cell to open the number pad — press digits in a row for two-digit frets (max 24). Add articulations with the buttons above or keys (h p / \\ b ~).",
};

export type Dict = typeof en;

const ko: Dict = {
  localeLabel: { en: "EN", ko: "한국어" },

  appTagline: "기타 릭 TAB 노트",
  password: "비밀번호",
  login: "들어가기",
  loggingIn: "확인 중…",
  wrongPassword: "비밀번호가 올바르지 않습니다.",

  licksCount: (n: number) => `모아둔 기타 릭 ${n}개`,
  exportJson: "내보내기",
  importJson: "가져오기",
  newLick: "새 릭",
  searchPlaceholder: "제목·메모·태그 검색…",
  searchAria: "릭 검색",
  all: "전체",
  tagFilterAria: "태그 필터",
  emptyTitleEmpty: "아직 비어 있어요",
  emptyTitleFiltered: "결과가 없어요",
  emptyBodyEmpty: "마음에 든 릭을 한 줄씩 적어두세요.",
  emptyBodyFiltered: "검색어나 태그를 바꿔보세요.",
  writeFirst: "첫 릭 적기",
  noTags: "태그 없음",
  noteCount: (n: number) => `${n}음`,

  back: "노트로",
  newLickHeading: "새 릭",
  editLickHeading: "릭 편집",

  titleLabel: "제목",
  titlePlaceholder: "예: BB 박스 벤딩",
  tabLabel: "TAB",
  tuningLabel: "튜닝",
  tagsLabel: "태그",
  tagsHint: "쉼표로 구분",
  tagsPlaceholder: "blues, bb-king",
  sourceLabel: "출처",
  sourceHint: "곡명 / 링크",
  sourcePlaceholder: "youtube.com/…",
  memoLabel: "메모",
  memoPlaceholder: "어디서 따왔는지, 어떤 느낌인지…",
  save: "저장하기",
  update: "수정하기",

  edit: "편집",
  del: "삭제",
  confirmDelete: "정말?",
  cancel: "취소",

  copy: "복사",
  copied: "복사됨 ✓",
  copyAria: "TAB을 ASCII로 복사",

  articulations: "주법",
  articToggleHint: "버튼으로 켜고 끄기",
  selectNoteHint: "음을 선택하면 적용할 수 있어요",
  hammerOn: "해머온",
  pullOff: "풀오프",
  slideUp: "슬라이드↑",
  slideDown: "슬라이드↓",
  fullBend: "풀 벤딩",
  halfBend: "하프 벤딩",
  vibrato: "비브라토",
  clearNote: "음 지우기",
  fretInputAria: "프렛 숫자 입력",
  addColumn: "칸 추가",
  deleteColumn: (c: number) => `칸 삭제 ${c + 1}`,
  editorTip:
    "팁: 칸을 탭하면 숫자 키패드가 떠요. 두 자리는 숫자를 이어서 누르세요(최대 24). 주법은 위 버튼 또는 단축키(h p / \\ b ~)로 입력합니다.",
};

export const dictionaries: Record<Locale, Dict> = { en, ko };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
