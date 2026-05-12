window.saveSupportDoc = async function() {
  var title = (document.getElementById('sd-title')||{}).value||'';
  if(!title.trim()){ alert('공문명을 입력해주세요.'); return; }
  
  var payload = {
    title: title.trim(),
    category: '공문',
    program: ((document.getElementById('sd-program')||{}).value||'').trim(),
    agency: ((document.getElementById('sd-agency')||{}).value||'').trim(),
    source_url: ((document.getElementById('sd-source-url')||{}).value||'').trim(),
    deadline: ((document.getElementById('sd-deadline')||{}).value||'').trim() || null,
    is_limitless: (document.getElementById('sd-is-limitless')||{}).checked ? 1 : 0,
    description: ((document.getElementById('sd-desc')||{}).value||'').trim(),
    file_name: _sdSelectedFiles.length > 0 ? _sdSelectedFiles[0].name : null,
    file_url: JSON.stringify(_sdSelectedFiles.map(function(f){ return {name:f.name, url:f.url || f.data}; }))
  };
  
  try {
    if(_sdEditId) {
      await apiCall('/api/support-docs/' + _sdEditId, { method:'PATCH', body: JSON.stringify(payload) });
    } else {
      payload.date = new Date().toISOString().slice(0,10);
      await apiCall('/api/support-docs', { method:'POST', body: JSON.stringify(payload) });
    }
    _sdSelectedFiles = [];
    _sdEditId = null;
    closeSupportDocModal();
    await _renderSupportDocTable();
    await _renderDashSupportDocs();
  } catch(e) {
    alert('저장 실패: ' + e.message);
  }
};

window.openSupportDocEditModal = function(id) {
  var item = _sdCache.find(function(x){ return x.id == id; });
  if(!item) return;
  _sdEditId = id;
  openSupportDocModal();
  
  // 기존 데이터 채우기
  var t = document.getElementById('sd-title'); if(t) t.value = item.title || '';
  var p = document.getElementById('sd-program'); if(p) p.value = item.program || '';
  var d = document.getElementById('sd-deadline'); if(d) d.value = item.deadline || '';
  var isl = document.getElementById('sd-is-limitless'); if(isl) isl.checked = !!item.is_limitless;
  var desc = document.getElementById('sd-desc'); if(desc) desc.value = item.description || '';
  var a = document.getElementById('sd-agency'); if(a) a.value = item.agency || '';
  var u = document.getElementById('sd-source-url'); if(u) u.value = item.source_url || '';
  
  // 파일 데이터 복원
  try {
    _sdSelectedFiles = JSON.parse(item.file_url || '[]');
  } catch(e) {
    if(item.file_url) _sdSelectedFiles = [{ name: item.file_name, url: item.file_url }];
    else _sdSelectedFiles = [];
  }
  _renderSdFileList();
  
  // 버튼 텍스트 변경
  var btn = document.querySelector('#support-doc-modal .btn-primary');
  if(btn) btn.textContent = '수정 완료';
};

async function _renderSupportDocTable() {
  var tbody = document.getElementById('support-doc-body');
  if(!tbody) return;
  var arr = await _loadSDFromServer();
  var cnt = document.getElementById('dashboard-support-count');
  if(cnt) cnt.textContent = arr.length+'건';
  if(!arr.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:#94a3b8;">등록된 공문이 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = arr.map(function(item){
    var files = [];
    try { files = JSON.parse(item.file_url || '[]'); } catch(e) { if(item.file_url) files = [{url:item.file_url, name:item.file_name}]; }
    var firstFile = files[0];
    var fileHtml = firstFile 
      ? '<div style="margin-top:6px;display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b;"><span style="color:#2563eb;">📎</span> '+_esc(firstFile.name)+'</div>'
      : '';
    
    var session = JSON.parse(localStorage.getItem('biz_session')||'null');
    var isAdmin = session && session.isAdmin;
    var pinIcon = item.is_pinned ? '<span style="color:#f59e0b;margin-right:4px;" title="상단고정">📌</span>' : '';
    var pinRowStyle = item.is_pinned ? 'background:#fffbeb;' : '';
    
    var adminBtns = isAdmin
      ? '<div style="display:flex;gap:4px;justify-content:center;white-space:nowrap;">'+
        '<button onclick="event.stopPropagation();openSupportDocEditModal('+item.id+')" style="padding:4px 8px;font-size:11px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;color:#2563eb;cursor:pointer;">수정</button>'+
        '<button onclick="event.stopPropagation();toggleSupportDocPin('+item.id+')" style="padding:4px 8px;font-size:14px;border:1px solid '+(item.is_pinned?'#86efac':'#fca5a5')+';border-radius:6px;background:'+(item.is_pinned?'#f0fdf4':'#fff5f5')+';cursor:pointer;" title="'+(item.is_pinned?'고정해제':'상단고정')+'">'+(item.is_pinned?'<span style="filter:hue-rotate(90deg);">📌</span>':'<span style="filter:hue-rotate(300deg);">📌</span>')+'</button>'+
        '<button onclick="event.stopPropagation();deleteSupportDoc('+item.id+')" style="padding:4px 8px;font-size:11px;border:1px solid #fca5a5;border-radius:6px;background:#fff5f5;color:#ef4444;cursor:pointer;">삭제</button>'+
        '</div>'
      : '-';

    return '<tr style="cursor:pointer;'+pinRowStyle+'" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\''+(item.is_pinned?'#fffbeb':'')+'\'" >'+
      '<td onclick="openSdViewModal('+item.id+')" style="padding:14px 12px;">'+
        '<div style="color:#1e40af;font-weight:600;font-size:14px;">'+pinIcon+_esc(item.title)+'</div>'+
        fileHtml +
      '</td>'+
      '<td onclick="openSdViewModal('+item.id+')" style="text-align:center;color:#64748b;font-size:13px;">'+_esc(item.date||'')+'</td>'+
      '<td onclick="openSdViewModal('+item.id+')" style="text-align:center;">'+(item.is_limitless ? '<span style="color:#ef4444;font-weight:600;font-size:13px;">소진시마감</span>' : (item.deadline?'<span style="color:#ef4444;font-weight:600;font-size:13px;">'+_esc(item.deadline)+'</span>':'-'))+'</td>'+
      '<td style="text-align:center;">'+adminBtns+'</td>'+
      '</tr>';
  }).join('');
}
