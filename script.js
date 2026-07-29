const SUPABASE_URL = 'https://rmqtopxawrrgntcqqnpa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcXRvcHhhd3JyZ250Y3FxbnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTIxMzQsImV4cCI6MjA5ODM2ODEzNH0.HoExHY9oNFdryWUC2u2UELLPfBNhH3P4L3zS03dvELA';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    fetchNews();
    checkUser();
});

async function fetchNews() {
    const { data, error } = await _supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    renderSection('local', data.filter(item => item.category === 'local'));
    renderSection('global', data.filter(item => item.category === 'global'));
    renderAdminList(data);
}

function renderSection(category, items) {
    const featuredContainer = document.getElementById(`${category}-featured`);
    const archiveContainer = document.getElementById(`${category}-archive`);
    
    featuredContainer.innerHTML = '';
    archiveContainer.innerHTML = '';

    const featured = items.slice(0, 3);
    const archive = items.slice(3);

    featured.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('ar-IQ');
        const uniqueId = `desc-${item.id}`;
        const btnId = `btn-${item.id}`;
        const cardId = `card-${item.id}`;
        const menuId = `menu-${item.id}`;
        
        featuredContainer.innerHTML += `
            <div id="${cardId}" data-id="${item.id}" class="news-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col relative">
                
                <!-- زر الثلاث نقاط الخاص بالتحكم (يظهر للمسؤول فقط) -->
                <div class="absolute top-2 left-2 z-10 auth-action-menu hidden">
                    <div class="relative">
                        <button onclick="toggleCardMenu('${menuId}')" class="bg-black bg-opacity-60 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-opacity-80 transition">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div id="${menuId}" class="absolute left-0 mt-1 w-28 bg-white rounded-md shadow-lg border hidden py-1 z-20">
                            <button onclick="editNews(${item.id}, '${escapeHtml(item.title)}', '${escapeHtml(item.description)}', '${item.image_url}', '${item.source_url || ''}', '${item.category}')" class="w-full text-right px-4 py-1.5 text-xs text-blue-600 hover:bg-gray-100 flex items-center"><i class="fa-solid fa-pen ml-1.5"></i>تعديل</button>
                            <button onclick="deleteNews(${item.id})" class="w-full text-right px-4 py-1.5 text-xs text-red-600 hover:bg-gray-100 flex items-center"><i class="fa-solid fa-trash ml-1.5"></i>حذف</button>
                        </div>
                    </div>
                </div>

                <img src="${item.image_url}" alt="صورة الخبر" class="h-48 w-full object-cover">
                <div class="p-4 flex flex-col flex-grow">
                    <h3 class="font-bold text-lg mb-2 text-primary">${item.title}</h3>
                    
                    <div class="mb-4 flex-grow">
                        <p id="${uniqueId}" class="text-gray-600 text-sm line-clamp-3 transition-all duration-300">${item.description}</p>
                        <button id="${btnId}" onclick="toggleDescription('${uniqueId}', '${btnId}')" class="text-accent text-xs font-bold mt-1 hidden hover:underline focus:outline-none">عرض المزيد</button>
                    </div>

                    ${item.source_url ? `<a href="${item.source_url}" target="_blank" class="text-accent text-sm font-semibold mb-3 hover:underline"><i class="fa-solid fa-link ml-1"></i>المصدر</a>` : ''}
                    
                    <div class="flex justify-between items-center text-gray-400 text-xs border-t pt-3 mt-auto">
                        <span><i class="fa-regular fa-clock ml-1"></i>${date}</span>
                        <div class="space-x-3 space-x-reverse">
                            <span class="hover:text-primary"><i class="fa-regular fa-eye ml-1"></i><span id="views-${item.id}">${item.views || 0}</span></span>
                            <button onclick="incrementLikes(${item.id})" class="text-red-500 hover:opacity-80"><i class="fa-regular fa-heart ml-1"></i>${item.likes || 0}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    setTimeout(() => {
        featured.forEach(item => {
            const el = document.getElementById(`desc-${item.id}`);
            const btn = document.getElementById(`btn-${item.id}`);
            if (el && btn && el.scrollHeight > el.clientHeight) {
                btn.classList.remove('hidden');
            }
        });
        setupViewObserver();
        checkUser(); // تطبيق الصلاحيات على العناصر الجديدة
    }, 50);

    if (archive.length === 0) {
        archiveContainer.innerHTML = `<li class="text-gray-400">لا توجد عناصر أخرى في الأرشيف</li>`;
    } else {
        archive.forEach(item => {
            archiveContainer.innerHTML += `
                <li class="flex justify-between items-center border-b pb-1">
                    <span class="font-medium text-gray-700">• ${item.title}</span>
                    <span class="text-xs text-gray-400">${new Date(item.created_at).toLocaleDateString('ar-IQ')}</span>
                </li>
            `;
        });
    }
}

// التحكم بقائمة الثلاث نقاط لكل بطاقة
function toggleCardMenu(menuId) {
    const menu = document.getElementById(menuId);
    document.querySelectorAll('[id^="menu-"]').forEach(m => {
        if (m.id !== menuId) m.classList.add('hidden');
    });
    menu.classList.toggle('hidden');
}

function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function toggleDescription(descId, btnId) {
    const descEl = document.getElementById(descId);
    const btnEl = document.getElementById(btnId);
    
    if (descEl.classList.contains('line-clamp-3')) {
        descEl.classList.remove('line-clamp-3');
        btnEl.textContent = 'إخفاء التفاصيل';
    } else {
        descEl.classList.add('line-clamp-3');
        btnEl.textContent = 'عرض المزيد';
    }
}

// مراقبة ظهور المنشور على الشاشة لاحتساب المشاهدة مرة واحدة
function setupViewObserver() {
    const observer = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const id = card.getAttribute('data-id');
                incrementViewsOnce(id);
                observerInstance.unobserve(card);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.news-card').forEach(card => {
        observer.observe(card);
    });
}

async function incrementViewsOnce(id) {
    const viewedKey = `viewed_${id}`;
    if (localStorage.getItem(viewedKey)) return;

    const { data } = await _supabase.from('news').select('views').eq('id', id).single();
    if (data) {
        const newViews = (data.views || 0) + 1;
        const { error } = await _supabase.from('news').update({ views: newViews }).eq('id', id);
        if (!error) {
            localStorage.setItem(viewedKey, 'true');
            const viewSpan = document.getElementById(`views-${id}`);
            if (viewSpan) viewSpan.textContent = newViews;
        }
    }
}

async function incrementLikes(id) {
    const likedKey = `liked_${id}`;
    
    if (localStorage.getItem(likedKey)) {
        alert('لقد قمت بالإعجاب بهذا المنشور مسبقاً!');
        return;
    }

    const { data } = await _supabase.from('news').select('likes').eq('id', id).single();
    const newLikes = (data.likes || 0) + 1;
    
    const { error } = await _supabase.from('news').update({ likes: newLikes }).eq('id', id);
    
    if (!error) {
        localStorage.setItem(likedKey, 'true');
        fetchNews();
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.toggle('hidden');
}

async function checkUser() {
    const { data: { session } } = await _supabase.auth.getSession();
    const actionMenus = document.querySelectorAll('.auth-action-menu');
    
    if (session) {
        document.getElementById('login-form')?.classList.add('hidden');
        document.getElementById('dashboard-content')?.classList.remove('hidden');
        actionMenus.forEach(menu => menu.classList.remove('hidden'));
    } else {
        document.getElementById('login-form')?.classList.remove('hidden');
        document.getElementById('dashboard-content')?.classList.add('hidden');
        actionMenus.forEach(menu => menu.classList.add('hidden'));
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else checkUser();
}

async function logout() {
    await _supabase.auth.signOut();
    checkUser();
}

async function saveNews(e) {
    e.preventDefault();
    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value;
    const description = document.getElementById('news-desc').value;
    const image_url = document.getElementById('news-image').value;
    const source_url = document.getElementById('news-source').value;
    const category = document.getElementById('news-category').value;

    const postData = { title, description, image_url, source_url, category };

    let error;
    if (id) {
        const res = await _supabase.from('news').update(postData).eq('id', id);
        error = res.error;
    } else {
        const res = await _supabase.from('news').insert([postData]);
        error = res.error;
    }

    if (error) {
        alert('حدث خطأ: ' + error.message);
    } else {
        document.getElementById('news-form').reset();
        document.getElementById('news-id').value = '';
        fetchNews();
        alert('تم الحفظ بنجاح');
    }
}

function renderAdminList(items) {
    const list = document.getElementById('admin-news-list');
    if (!list) return;
    list.innerHTML = '';
    items.forEach(item => {
        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 rounded border text-sm">
                <span class="truncate max-w-[200px]">${item.title}</span>
                <div class="space-x-2 space-x-reverse">
                    <button onclick="editNews(${item.id}, '${escapeHtml(item.title)}', '${escapeHtml(item.description)}', '${item.image_url}', '${item.source_url || ''}', '${item.category}'); toggleAuthModal();" class="text-blue-600">تعديل</button>
                    <button onclick="deleteNews(${item.id})" class="text-red-600">حذف</button>
                </div>
            </div>
        `;
    });
}

function editNews(id, title, desc, img, src, cat) {
    document.getElementById('news-id').value = id;
    document.getElementById('news-title').value = title;
    document.getElementById('news-desc').value = desc;
    document.getElementById('news-image').value = img;
    document.getElementById('news-source').value = src;
    document.getElementById('news-category').value = cat;
    
    // إظهار نافذة لوحة التحكم لكي يرى المستخدم النموذج مفتوحاً للتعديل
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.remove('hidden');
}

async function deleteNews(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        const { error } = await _supabase.from('news').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchNews();
    }
}
