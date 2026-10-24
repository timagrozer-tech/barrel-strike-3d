# Проверка: одни и те же глобальные let/const не объявлены в двух скриптах.
import re,sys,glob,collections
files=['engine','save','audio','art','combat','render','story','ui','office','market','main']
seen=collections.defaultdict(list)
for f in files:
    s=open(f'/home/claude/void-frontier/www/js/{f}.js',encoding='utf-8').read()
    depth=0;i=0;tops=[]
    # грубый парсер: собираем объявления на нулевой глубине скобок
    buf=''
    for line in s.split('\n'):
        if depth==0:
            m=re.match(r'\s*(let|const|function)\s+(.*)',line)
            if m:
                if m.group(1)=='function': tops.append(re.match(r'(\w+)',m.group(2)).group(1))
                else:
                    decl=m.group(2);d=0;cur=''
                    for ch in decl:
                        if ch in '([{':d+=1
                        elif ch in ')]}':d-=1
                        if d==0 and ch in ',;':
                            n=re.match(r'\s*(\w+)',cur)
                            if n:tops.append(n.group(1))
                            cur='';
                            if ch==';':break
                            continue
                        if d==0 and ch=='=':cur+='\x00';continue
                        if '\x00' not in cur:cur+=ch
                        else: cur+= '' 
                    n=re.match(r'\s*(\w+)',cur)
                    if n and n.group(1) not in tops[-1:]:tops.append(n.group(1))
        depth+=line.count('{')+line.count('(')+line.count('[')-line.count('}')-line.count(')')-line.count(']')
    for n in set(tops):seen[n].append(f)
dups={k:v for k,v in seen.items() if len(v)>1}
print('DUPLICATES:',dups if dups else 'none')
sys.exit(1 if dups else 0)
