const legalContent = {
    ru: {
        eyebrow: 'Открыто и по-человечески',
        navigation: 'Разделы документа',
        privacyLink: 'Конфиденциальность',
        termsLink: 'Условия пользования',
        home: 'На главную',
        cookieSettings: 'Изменить выбор cookie',
        version: 'Редакция от 22 октября 2026',
        contacts: 'Связаться с нами',
        contactsLoading: 'Проверяем актуальные контакты…',
        contactsUnavailable: 'Не удалось проверить актуальность контактов. Попробуйте обновить их ещё раз.',
        retryContacts: 'Обновить контакты',
        operator: 'Оператор сервиса',
        missingOperator: 'Сведения об операторе ещё не указаны.',
        missingEmail: 'Контактная почта ещё не указана.',
        contactHint:
            'В обращении укажите ссылку на страницу или тег, суть вопроса и способ связаться с вами. Не отправляйте пароль, коды входа и копии документов без отдельного защищённого запроса.',
        privacy: {
            title: 'Политика конфиденциальности',
            intro: 'Какие данные нужны «Тем ещё людям», что видят другие посетители и как управлять своей информацией.',
            sections: [
                {
                    id: 'about',
                    title: 'О чём эта политика',
                    paragraphs: [
                        'Эта политика описывает обработку персональных данных на сайте «Те ещё люди», в его ID и связанных функциях: страницах персон, каталоге, отзывах, комментариях, медиа, достижениях и модерации. Она относится и к владельцам аккаунтов, и к посетителям, и к людям, о которых опубликованы материалы.',
                        'Оператор определяет цели и способы обработки. Его сведения и контакт для обращений приведены в конце документа. Описание персонажа как вымышленного или отметка об использовании ИИ не отменяют права реального человека, если его можно узнать в публикации.',
                    ],
                },
                {
                    id: 'data',
                    title: 'Какие данные обрабатываются',
                    paragraphs: [
                        'Для аккаунта используются имя, фамилия, необязательное отчество, электронная почта, выбранный язык, аватар, сведения о подтверждении почты и сеансах. Пароль хранится в виде стойкого хеша; он не должен передаваться другим пользователям. При входе через Яндекс ID используются данные, разрешённые пользователем у провайдера, для входа и связывания аккаунта.',
                        'Сервис обрабатывает опубликованные имена и теги персон, описания, фото и видео, отметки людей, отзывы, оценки, реакции, комментарии, достижения, записи о займах, заявки на привязку страницы, обращения и решения модерации. Технические данные могут включать IP-адрес, сведения браузера, время запросов, идентификаторы сеанса и посетителя, журналы ошибок и безопасности.',
                        'Не публикуйте паспортные и платёжные данные, домашние адреса, медицинские сведения, чужие контакты и иную чувствительную информацию. Аватар не используется для установления личности с помощью распознавания лица. Сведения о займах предназначены для пользовательских записей: сервис не получает доступ к банковским счетам.',
                    ],
                },
                {
                    id: 'purposes',
                    title: 'Цели и основания обработки',
                    paragraphs: [
                        'Данные аккаунта нужны для регистрации, подтверждения почты, входа, восстановления доступа и защиты сеансов. Пользовательский контент нужен для работы выбранных пользователем функций, отображения страниц и взаимодействия участников. Сведения об обращениях и нарушениях используются для поддержки, модерации, защиты прав и выполнения применимых требований закона.',
                        'Для каждой операции требуется самостоятельное применимое основание: исполнение пользовательского соглашения, выполнение обязанности по закону либо отдельное согласие там, где оно необходимо. Принятие условий пользования и ознакомление с политикой сами по себе не являются согласием на любые операции с данными, рекламу или распространение сведений о третьих лицах.',
                    ],
                },
                {
                    id: 'public',
                    title: 'Что доступно другим людям',
                    paragraphs: [
                        'Опубликованные страницы персон, их имена, теги, описания и размещённые на них материалы могут быть доступны всем посетителям, включая людей без аккаунта, и поисковым системам. В каталоге показываются публичные сведения страницы, а не закрытый список зарегистрированных аккаунтов. Почта для входа, пароль, коды подтверждения, сведения о сеансах и приватные доказательства для модерации не должны отображаться в публичном каталоге.',
                        'Перед размещением сведений о другом человеке убедитесь в наличии законного основания и необходимых разрешений. Если законодательство требует согласия на распространение, оно оформляется отдельно. Одна регистрационная галочка не даёт права публиковать любые чужие фотографии и сведения. После публикации возможны копии, сделанные другими людьми; удаление с сайта не гарантирует их удаления из чужих систем.',
                    ],
                },
                {
                    id: 'cookies',
                    title: 'Cookie и настройки устройства',
                    paragraphs: [
                        'Необходимые cookie поддерживают вход, безопасность и сохранение выбора cookie. Сайт также сохраняет выбранные вами язык, тему и настройки интерфейса. Они нужны для работы соответствующих функций.',
                        'Необязательный идентификатор для учёта просмотров используется только после нажатия «Согласен». До выбора и после отказа такой идентификатор не сохраняется, а сайт остаётся доступным. Изменить выбор можно кнопкой ниже. Сам выбор сохраняется на один год. Удалить cookie и локальные настройки также можно в браузере; после этого может потребоваться повторный вход.',
                        'После согласия на основном сайте, в ID и CMS подключается Яндекс Метрика (счётчик 113741427) для статистики посещений и переходов. Выбор cookie действует на этих поддоменах. Метрика получает технические сведения о браузере и устройстве, адреса страниц и источники переходов; из передаваемых нами адресов удаляются параметры форм, коды, токены и фрагменты. Вебвизор и запись форм выключены. После отказа Метрика не загружается, а уже запущенный счётчик останавливается. Данные обрабатываются сервисом Яндекса; подробности: https://yandex.ru/support/metrica/ru/general/confidential-data.',
                    ],
                },
                {
                    id: 'sharing',
                    title: 'Подрядчики и передача данных',
                    paragraphs: [
                        'Работа сайта может требовать хостинга, хранения медиа, отправки писем и технического сопровождения. Подрядчикам предоставляется только доступ, необходимый для их задачи, на согласованных условиях защиты данных. Яндекс ID обрабатывает данные при авторизации по своим документам; переход к провайдеру не означает передачи ему всего содержимого вашего аккаунта.',
                        'Базы данных и хранилище медиа размещаются в России. Сведения о привлекаемых для обработки подрядчиках можно запросить у оператора по контактам ниже. Передача данных за пределы России допускается только при соблюдении применимых требований и наличии необходимого основания. Раскрытие государственным органам допускается при наличии надлежащего законного основания.',
                    ],
                },
                {
                    id: 'retention',
                    title: 'Хранение и удаление',
                    paragraphs: [
                        'Данные хранятся не дольше, чем это необходимо для соответствующей цели или предусмотрено законом. Аккаунт, опубликованный контент, журналы безопасности, обращения и резервные копии имеют разные жизненные циклы. Блокировка аккаунта или скрытие публикации не означают автоматического уничтожения всех связанных данных.',
                        'После удаления публикации или страницы связанные медиа скрываются от посетителей. Предельный срок хранения удалённых медиа в закрытом хранилище — пять лет с даты удаления; этот срок не распространяется на действующие публикации. Хранение допускается только при наличии законного основания и необходимости, например для рассмотрения спора и защиты прав. Если основания больше нет или закон требует более раннего уничтожения, данные уничтожаются раньше. Пятилетний срок не ограничивает право обратиться за удалением персональных данных.',
                    ],
                },
                {
                    id: 'rights',
                    title: 'Ваши права и обращения',
                    paragraphs: [
                        'Вы можете запросить информацию об обработке ваших данных, исправление неточностей, ограничение или прекращение неправомерной обработки, удаление при наличии оснований и отзыв ранее предоставленного согласия. Дополнительные права определяются применимым законодательством. Отзыв согласия не отменяет обработку, для которой существует другое законное основание.',
                        'Это относится и к человеку, у которого нет аккаунта, но есть страница или упоминание на сайте. Для обращения используйте контакт в конце документа. Оператор может запросить соразмерное подтверждение связи с данными, чтобы не раскрыть их постороннему, и отвечает в сроки, установленные применимым законом. Вы вправе обратиться в компетентный орган по защите данных или в суд.',
                    ],
                },
                {
                    id: 'security',
                    title: 'Безопасность и несовершеннолетние',
                    paragraphs: [
                        'Оператор применяет соразмерные правовые, организационные и технические меры: ограничение доступа, защиту сеансов, хеширование паролей и проверку административных действий. Полной неуязвимости нельзя гарантировать. Если вы заметили утечку или чужой доступ, завершите подозрительные сеансы и сообщите об инциденте, не публикуя секреты.',
                        'Сервис не предназначен для самостоятельного использования детьми младше 18 лет. Если вы законный представитель и обнаружили данные ребёнка, направьте обращение для проверки и принятия мер. Заявление о возрасте аудитории не освобождает оператора от защиты фактически полученных данных.',
                    ],
                },
                {
                    id: 'changes',
                    title: 'Изменения политики',
                    paragraphs: [
                        'Актуальная редакция публикуется на этой странице с датой. О существенных изменениях целей, состава данных и условий доступа оператор информирует доступным способом до начала соответствующей обработки. Если требуется новое согласие, оно запрашивается отдельно; продолжение просмотра сайта не заменяет такое согласие.',
                    ],
                },
            ],
        },
        terms: {
            title: 'Условия пользования',
            intro: 'Правила нашей компании: как пользоваться сервисом, уважать чужие границы и решать спорные ситуации.',
            sections: [
                {
                    id: 'service',
                    title: 'О сервисе и соглашении',
                    paragraphs: [
                        '«Те ещё люди» — сервис страниц персон и историй сообщества: здесь можно размещать материалы, оставлять отзывы и комментарии, реагировать, отмечать людей и просматривать достижения. Оператор указан в разделе контактов. Эти условия регулируют использование сайта и ID в пределах применимого законодательства.',
                        'При регистрации пользователь совершает отдельное действие — отмечает незаполненный заранее чекбокс принятия условий. Просмотр публичных страниц не означает согласия на операции, для которых закон требует отдельного волеизъявления. Политика конфиденциальности объясняет обработку данных и доступна по отдельной ссылке.',
                    ],
                },
                {
                    id: 'account',
                    title: 'Регистрация и аккаунт',
                    paragraphs: [
                        'Создать аккаунт может лицо от 18 лет, имеющее право принять соглашение. Указывайте актуальную почту, к которой у вас есть доступ, и достоверные сведения, необходимые для аккаунта. Публичное имя или псевдоним не должны вводить в заблуждение относительно личности другого человека.',
                        'Сохраняйте пароль и коды в тайне. Не передавайте аккаунт для обхода ограничений. При подозрении на посторонний доступ смените пароль, завершите сеансы и сообщите оператору. Действия аккаунта проверяются с учётом обстоятельств; одно наличие сеанса не освобождает оператора от рассмотрения сообщения о взломе.',
                    ],
                },
                {
                    id: 'pages',
                    title: 'Страницы людей и каталог',
                    paragraphs: [
                        'Страница персоны и аккаунт — разные сущности. Наличие страницы, тега, оценки или отметки не подтверждает, что человек зарегистрирован, одобряет материалы или управляет страницей. Запросить привязку или оспорить сведения можно через доступные функции и контакт оператора.',
                        'Каталог содержит публичные страницы. Сортировка по просмотрам использует счётчик просмотров, а популярность в демонстрационном каталоге основана на условных реакциях. Эти показатели не являются объективной оценкой личности, кредитоспособности или деловой репутации. Демонстрационные данные не выдаются за реальные показатели пользователей.',
                    ],
                },
                {
                    id: 'content',
                    title: 'Публикации и права на контент',
                    paragraphs: [
                        'Вы сохраняете права на собственные материалы и отвечаете за законность их размещения. Не загружайте чужие произведения, изображения и персональные данные без необходимых прав и оснований. Для публикации узнаваемого человека учитывайте его права на изображение, частную жизнь и данные.',
                        'Размещая материал, вы предоставляете оператору неисключительное разрешение хранить, технически обрабатывать, создавать необходимые превью и показывать его в рамках функций сервиса и выбранной доступности. Разрешение действует в объёме, необходимом для работы сервиса; оно не означает передачу исключительных прав или согласие на использование лица в рекламе.',
                        'Не выдавайте художественные, сатирические и созданные ИИ материалы за документально подтверждённые факты. Отметка «вымышленный персонаж» не оправдывает нарушение прав узнаваемого реального человека. Не размещайте материалы о людях, которые обоснованно возражают против неправомерной публикации.',
                    ],
                },
                {
                    id: 'conduct',
                    title: 'Правила общения',
                    paragraphs: [
                        'Запрещены угрозы, травля, дискриминация, публикация чужих секретов и контактов, незаконный контент, мошенничество, спам и выдача себя за другого. Нельзя публиковать интимные материалы без согласия, данные детей без необходимых оснований и заведомо ложные обвинения.',
                        'Не обходите блокировки, не вмешивайтесь в работу сайта, не пытайтесь получить чужие сеансы и не собирайте персональные данные массово без законного основания. Добросовестное сообщение оператору о проблеме безопасности должно исключать разглашение чужих данных и причинение вреда.',
                    ],
                },
                {
                    id: 'reviews',
                    title: 'Отзывы, оценки и займы',
                    paragraphs: [
                        'Отзывы должны опираться на ваш опыт и различать факты и личное мнение. Оценки, реакции и достижения могут быть субъективными, игровыми и ошибочными. Не используйте их как единственное основание для важных решений о другом человеке.',
                        'Записи о займах — пользовательские записи об обстоятельствах, которые участники вправе оспорить. Сервис не является банком, кредитором, платёжной системой, коллектором или гарантом возврата денег. Запись на странице не подтверждает наличие долга и не заменяет договор, расчётные документы или судебное решение.',
                    ],
                },
                {
                    id: 'moderation',
                    title: 'Модерация и обжалование',
                    paragraphs: [
                        'В зависимости от настроек материал может публиковаться сразу или поступать на предварительную проверку. Автоматическая публикация и одобрение модератора не являются гарантией достоверности и не лишают человека права подать жалобу.',
                        'При нарушении правил оператор может скрыть материал, отклонить изменение, ограничить отдельные действия или аккаунт. Меры должны быть соразмерны обстоятельствам. Где это допустимо, пользователь получает причину и информацию о сроке ограничения. Для обжалования укажите материал, решение и ваши доводы через обращение оператору.',
                    ],
                },
                {
                    id: 'availability',
                    title: 'Доступность и ответственность',
                    paragraphs: [
                        'Оператор поддерживает работу сервиса, но возможны технические перерывы, ошибки и потеря доступа. Храните собственные копии важных материалов. Информация сообщества предоставляется без обещания полноты и точности; ссылки на сторонние сайты подчиняются их условиям.',
                        'Каждая сторона отвечает за свои действия в предусмотренных законом пределах. Эти условия не исключают ответственность, которую нельзя исключить законом, и не ограничивают обязательные права пользователей. Споры о незаконном контенте рассматриваются по существу, независимо от общего описания сервиса как развлекательного.',
                    ],
                },
                {
                    id: 'termination',
                    title: 'Прекращение использования',
                    paragraphs: [
                        'Вы можете прекратить пользоваться сервисом, завершить сеансы и обратиться по вопросу удаления аккаунта и связанных данных. Последствия удаления для публикаций, обращений и резервных копий определяются политикой и применимым законом; удаление аккаунта не уничтожает автоматически все материалы других авторов.',
                        'Оператор может прекратить предоставление сервиса или доступ к нему на законном основании, по возможности предупредив пользователей. Условия, необходимые для рассмотрения уже возникших требований и защиты прав, сохраняют действие в допустимом законом объёме.',
                    ],
                },
                {
                    id: 'updates',
                    title: 'Изменения и разрешение споров',
                    paragraphs: [
                        'Новая редакция публикуется с датой. О существенных изменениях оператор сообщает до их применения; когда это необходимо, требуется новое явное принятие условий. Изменения не применяются задним числом к уже возникшим обязательствам, если иное не предусмотрено законом.',
                        'Сначала направьте описание проблемы по контактам ниже — это поможет найти решение. Обращение не ограничивает право на защиту в суде или компетентном органе. Применимое право и подсудность определяются обязательными нормами с учётом местонахождения оператора и пользователя; конкретные реквизиты должны быть подтверждены перед публикацией.',
                    ],
                },
            ],
        },
    },
    en: {
        eyebrow: 'Open, clear, human',
        navigation: 'On this page',
        privacyLink: 'Privacy policy',
        termsLink: 'Terms of use',
        home: 'Back home',
        cookieSettings: 'Change cookie preferences',
        version: 'Version dated 22 October 2026',
        contacts: 'Get in touch',
        contactsLoading: 'Checking current contact details…',
        contactsUnavailable: 'Unable to check whether these contact details are current. Please try again.',
        retryContacts: 'Refresh contacts',
        operator: 'Service operator',
        missingOperator: 'Operator details have not been provided yet.',
        missingEmail: 'A contact email has not been provided yet.',
        contactHint:
            'Include the page URL or tag, a description of your request and a way to reach you. Do not send passwords, login codes or identity documents without a separate secure request.',
        privacy: {
            title: 'Privacy policy',
            intro: 'What “Те ещё люди” needs to work, what other visitors can see and how to manage information about you.',
            sections: [
                {
                    id: 'about',
                    title: 'About this policy',
                    paragraphs: [
                        'This policy covers personal data on the “Те ещё люди” website, its ID service, person pages, directory, reviews, comments, media, achievements and moderation. It applies to account holders, visitors and people mentioned in published content.',
                        'The operator determines the purposes and methods of processing. Its details and contact information appear at the end of this document. Describing a character as fictional or marking content as AI-generated does not remove the rights of a real person who can be identified in it.',
                    ],
                },
                {
                    id: 'data',
                    title: 'Data we process',
                    paragraphs: [
                        'Account data includes first and last name, optional middle name, email, language, avatar, email verification and session information. Passwords are stored as strong hashes and must not be shared with other users. Yandex ID sign-in uses information you authorise the provider to share for authentication and account linking.',
                        'Service content can include public names, tags, descriptions, photos, videos, mentions, reviews, ratings, reactions, comments, achievements, loan records, ownership requests, support requests and moderation decisions. Technical data can include IP addresses, browser details, request times, session and visitor identifiers, error logs and security logs.',
                        'Do not post identity or payment documents, home addresses, medical information, private contact details or other sensitive information. Avatars are not used for facial recognition to identify people. Loan records do not provide the service with access to bank accounts.',
                    ],
                },
                {
                    id: 'purposes',
                    title: 'Purposes and legal grounds',
                    paragraphs: [
                        'Account information supports registration, email verification, sign-in, recovery and session security. User content supports the features you choose, page display and community interactions. Reports and violation records support assistance, moderation, protection of rights and applicable legal duties.',
                        'Each operation needs an appropriate legal ground, such as performance of the user agreement, a legal duty or separate consent where required. Accepting the terms and acknowledging this policy do not constitute consent to every processing operation, advertising or disclosure of third-party information.',
                    ],
                },
                {
                    id: 'public',
                    title: 'What other people can see',
                    paragraphs: [
                        'Published person pages, names, tags, descriptions and their content may be available to everyone, including visitors without accounts and search engines. The directory displays public page information, rather than a private account register. Login emails, passwords, verification codes, session details and private moderation evidence must not appear in the public directory.',
                        'Before publishing information about another person, ensure that you have a lawful basis and the necessary permissions. Consent to public disclosure, where required, is obtained separately. A registration checkbox does not authorise every use of another person’s photo or information. Other people may copy published content; removal from this site cannot guarantee removal from their systems.',
                    ],
                },
                {
                    id: 'cookies',
                    title: 'Cookies and device preferences',
                    paragraphs: [
                        'Necessary cookies support sign-in, security and remembering your cookie choice. The site also remembers language, theme and interface preferences you select to provide those functions.',
                        'The optional visitor identifier used for view counts is enabled only after you select “Agree”. No such identifier is stored before your choice or after refusal, and the site remains available. You can change your choice below. The choice itself is remembered for one year. You can also clear cookies and local preferences in your browser; you may need to sign in again afterwards.',
                        'After consent, the main site, ID and CMS use Yandex Metrica (counter 113741427) to measure visits and navigation. Your cookie choice applies across these subdomains. Metrica receives technical browser and device information, page addresses and referral sources; addresses explicitly sent by us exclude form parameters, codes, tokens and fragments. Session Replay and form recording are disabled. After refusal, Metrica is not loaded and an already running counter is stopped. Yandex processes the analytics data; details: https://yandex.ru/support/metrica/en/general/confidential-data.',
                    ],
                },
                {
                    id: 'sharing',
                    title: 'Providers and disclosure',
                    paragraphs: [
                        'The service may require hosting, media storage, email delivery and technical support. Providers receive only the access needed for their work, under appropriate data protection terms. Yandex ID processes authentication data under its own policies; using that provider does not give it access to all your account content.',
                        'Databases and media storage are located in Russia. You can request information about service providers processing data using the contact details below. Any transfer outside Russia requires compliance with applicable requirements and an appropriate legal basis. Disclosure to authorities requires an appropriate legal basis.',
                    ],
                },
                {
                    id: 'retention',
                    title: 'Retention and deletion',
                    paragraphs: [
                        'Data is kept no longer than needed for its purpose or required by law. Accounts, published content, security logs, requests and backups have different lifecycles. Blocking an account or hiding a post does not automatically erase all associated data.',
                        'Media associated with a deleted post or page is hidden from visitors. Deleted media may be retained in private storage for at most five years from deletion; this period does not apply to active posts. Retention requires a lawful basis and continuing necessity, for example to resolve a dispute or protect rights. Data is destroyed earlier when that basis ends or the law requires earlier destruction. The five-year limit does not restrict your right to request erasure of personal data.',
                    ],
                },
                {
                    id: 'rights',
                    title: 'Your rights and requests',
                    paragraphs: [
                        'You may request information about processing, correction, restriction or termination of unlawful processing, deletion where applicable and withdrawal of consent. Additional rights depend on applicable law. Withdrawing consent does not prevent processing supported by a different valid legal ground.',
                        'You can also contact the operator if you have no account but are mentioned on the site. Use the contact details below. Proportionate verification may be needed to protect your information from disclosure to someone else. The operator responds within applicable statutory time limits. You may contact a competent data protection authority or a court.',
                    ],
                },
                {
                    id: 'security',
                    title: 'Security and children',
                    paragraphs: [
                        'The operator applies proportionate legal, organisational and technical safeguards, including access controls, session protection, password hashing and review of administrative actions. No system is completely secure. If you suspect a breach, end suspicious sessions and report it without publishing secrets.',
                        'The service is not intended for independent use by children under 18. A legal representative who finds a child’s information can request a review and appropriate action. An intended audience statement does not remove duties to protect data actually received.',
                    ],
                },
                {
                    id: 'changes',
                    title: 'Policy changes',
                    paragraphs: [
                        'The current version is published here with its date. Material changes to purposes, data categories or access conditions are communicated through available channels before the relevant processing begins. New consent is obtained separately when required; continued browsing does not replace it.',
                    ],
                },
            ],
        },
        terms: {
            title: 'Terms of use',
            intro: 'The rules of our community: using the service, respecting boundaries and resolving disagreements.',
            sections: [
                {
                    id: 'service',
                    title: 'The service and agreement',
                    paragraphs: [
                        '“Те ещё люди” is a community service for person pages and stories, with posts, reviews, comments, reactions, mentions and achievements. The operator is identified in the contact section. These terms govern the website and ID service subject to applicable law.',
                        'Registration includes a separate affirmative action: selecting a checkbox that is unchecked by default. Viewing public pages does not imply consent to operations requiring separate permission. The privacy policy explains data processing and is available separately.',
                    ],
                },
                {
                    id: 'account',
                    title: 'Registration and your account',
                    paragraphs: [
                        'Accounts are available to people aged 18 or over who have capacity to enter this agreement. Provide an accessible current email and accurate information needed for your account. Public names and pseudonyms must not impersonate another person.',
                        'Keep passwords and codes private and do not share an account to evade restrictions. If you suspect unauthorised access, change your password, end sessions and notify the operator. Account activity is assessed in context; an active session does not remove the duty to investigate a reported compromise.',
                    ],
                },
                {
                    id: 'pages',
                    title: 'Person pages and directory',
                    paragraphs: [
                        'A person page is distinct from an account. A page, tag, rating or mention does not prove that its subject registered, approved the content or controls the page. Use the available ownership request and support channels to claim a page or challenge information.',
                        'The directory contains public pages. View sorting uses view counts; popularity in the demonstration directory uses sample reaction totals. These metrics are not objective assessments of character, creditworthiness or professional reputation. Demonstration data must not be presented as real user statistics.',
                    ],
                },
                {
                    id: 'content',
                    title: 'Content and intellectual property',
                    paragraphs: [
                        'You retain rights to your own material and are responsible for having a lawful basis to post it. Do not upload works, images or personal data without the necessary rights and permissions. Publishing an identifiable person requires respect for their image, privacy and data rights.',
                        'Uploading content grants the operator a non-exclusive permission to store, technically process, generate necessary previews and display it through the service within its selected availability. This permission is limited to operating the service; it does not transfer exclusive rights or permit use of a person’s likeness in advertising.',
                        'Do not present artistic, satirical or AI-generated material as verified fact. A fictional-character label does not excuse infringements involving an identifiable real person. Respect substantiated objections to unlawful publication.',
                    ],
                },
                {
                    id: 'conduct',
                    title: 'Community conduct',
                    paragraphs: [
                        'Threats, harassment, discrimination, disclosure of secrets or private contacts, illegal content, scams, spam and impersonation are prohibited. Do not post non-consensual intimate content, children’s data without the required grounds or knowingly false accusations.',
                        'Do not evade restrictions, disrupt the site, obtain other people’s sessions or collect personal data in bulk without a lawful basis. Good-faith security reports must avoid disclosing other people’s data or causing harm.',
                    ],
                },
                {
                    id: 'reviews',
                    title: 'Reviews, ratings and loans',
                    paragraphs: [
                        'Reviews should reflect your experience and distinguish facts from opinions. Ratings, reactions and achievements may be subjective, playful or mistaken. Do not use them as the sole basis for consequential decisions about a person.',
                        'Loan entries are user-submitted records whose contents may be disputed. The service is not a bank, lender, payment system, debt collector or repayment guarantor. An entry is not proof of a debt and does not replace an agreement, payment record or court decision.',
                    ],
                },
                {
                    id: 'moderation',
                    title: 'Moderation and appeals',
                    paragraphs: [
                        'Depending on settings, content may appear immediately or undergo prior review. Automatic publication and moderator approval are not guarantees of accuracy and do not remove anyone’s right to report a problem.',
                        'For rule violations, the operator may hide content, reject changes, restrict features or limit an account. Measures should be proportionate to the circumstances. Where permitted, users receive reasons and duration information. To appeal, identify the material or decision and explain your grounds through the operator’s support channel.',
                    ],
                },
                {
                    id: 'availability',
                    title: 'Availability and responsibility',
                    paragraphs: [
                        'The operator maintains the service, but interruptions, errors and loss of access are possible. Keep your own copies of important material. Community information is provided without a promise of completeness or accuracy; external sites have their own terms.',
                        'Each party remains responsible for its actions within applicable law. These terms do not exclude liability that cannot lawfully be excluded or limit mandatory user rights. Unlawful-content reports are assessed on their merits regardless of the service’s entertainment purpose.',
                    ],
                },
                {
                    id: 'termination',
                    title: 'Ending use',
                    paragraphs: [
                        'You can stop using the service, end sessions and request account and data deletion. The effect on posts, requests and backups follows the privacy policy and applicable law. Account deletion does not automatically remove every contribution by other authors.',
                        'The operator may discontinue the service or access on a lawful basis, providing notice where possible. Provisions needed to resolve existing claims and protect rights continue to apply to the extent permitted by law.',
                    ],
                },
                {
                    id: 'updates',
                    title: 'Updates and disputes',
                    paragraphs: [
                        'Revised terms are published with a date. Material changes are communicated before taking effect, and renewed express acceptance is obtained where needed. Changes do not retrospectively alter existing obligations unless the law provides otherwise.',
                        'Send a description of the problem using the contact details below to help find a solution. Contacting support does not limit access to a court or competent authority. Applicable law and jurisdiction follow mandatory rules, considering the operator’s and user’s locations; specific operator details must be confirmed before publication.',
                    ],
                },
            ],
        },
    },
} as const;

function documentMessages(
    document:
        | typeof legalContent.ru.privacy
        | typeof legalContent.ru.terms
        | typeof legalContent.en.privacy
        | typeof legalContent.en.terms,
) {
    return {
        title: document.title,
        intro: document.intro,
        sections: Object.fromEntries(
            document.sections.map((section) => [
                section.id,
                {
                    id: section.id,
                    title: section.title,
                    paragraphs: Object.fromEntries(
                        section.paragraphs.map((paragraph, index) => [`p${index + 1}`, paragraph]),
                    ),
                },
            ]),
        ),
    };
}

export const legalMessages = {
    ru: {
        ...legalContent.ru,
        privacy: documentMessages(legalContent.ru.privacy),
        terms: documentMessages(legalContent.ru.terms),
    },
    en: {
        ...legalContent.en,
        privacy: documentMessages(legalContent.en.privacy),
        terms: documentMessages(legalContent.en.terms),
    },
};
