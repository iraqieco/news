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
        
        featuredContainer.innerHTML += `
            <div class="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col">
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
                            <button onclick="incrementViews(${item.id})" class="hover:text-primary"><i class="fa-regular fa-eye ml-1"></i>${item.views || 0}</button>
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

async function incrementViews(id) {
    const { data } = await _supabase.from('news').select('views').eq('id', id).single();
    await _supabase.from('news').update({ views: (data.views || 0) + 1 }).eq('id', id);
    fetchNews();
}

async function incrementLikes(id) {
    const likedKey = `liked_${id}`;
    
    // التحقق مما إذا كان المستخدم قد أُعجب بهذا المنشور مسبقاً
    if (localStorage.getItem(likedKey)) {
        alert('لقد قمت الإعجاب بهذا المنشور مسبقاً!');
        return;
    }

    const { data } = await _supabase.from('news').select('likes').eq('id', id).single();
    const newLikes = (data.likes || 0) + 1;
    
    const { error } = await _supabase.from('news').update({ likes: newLikes }).eq('id', id);
    
    if (!error) {
        // حفظ حالة الإعجاب في المتصفح لكي لا يضغط مرة أخرى
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
    if (session) {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');
    } else {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('dashboard-content').classList.add('hidden');
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
    list.innerHTML = '';
    items.forEach(item => {
        list.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 rounded border text-sm">
                <span class="truncate max-w-[200px]">${item.title}</span>
                <div class="space-x-2 space-x-reverse">
                    <button onclick="editNews(${item.id}, '${item.title}', '${item.description}', '${item.image_url}', '${item.source_url || ''}', '${item.category}')" class="text-blue-600">تعديل</button>
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
}

async function deleteNews(id) {
    if (confirm('هل أنت متأكد من الحذف؟')) {
        const { error } = await _supabase.from('news').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchNews();
    }
}

